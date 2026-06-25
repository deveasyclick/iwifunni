package workflow

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/deveasyclick/iwifunni/internal/db"
	"github.com/deveasyclick/iwifunni/internal/modules/templates"
	"github.com/deveasyclick/iwifunni/internal/types"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

func (s *Service) ProcessStep(ctx context.Context, job types.WorkflowStepJob) error {
	environmentID, err := uuid.Parse(strings.TrimSpace(job.EnvironmentID))
	if err != nil {
		return ErrInvalidWorkflowEvent
	}
	executionID, err := uuid.Parse(strings.TrimSpace(job.ExecutionID))
	if err != nil {
		return ErrInvalidWorkflowEvent
	}
	workflowID, err := uuid.Parse(strings.TrimSpace(job.WorkflowID))
	if err != nil {
		return ErrInvalidWorkflowEvent
	}
	stepID := strings.TrimSpace(job.StepID)
	if stepID == "" {
		return ErrInvalidWorkflowEvent
	}

	execution, err := s.repo.GetExecutionByID(ctx, executionID, environmentID)
	if err != nil {
		return err
	}
	workflowRecord, err := s.repo.GetByID(ctx, workflowID, environmentID)
	if err != nil {
		return err
	}

	definition, err := parseDefinition(workflowRecord.DefinitionJson)
	if err != nil || definition == nil {
		return ErrInvalidWorkflow
	}
	node, err := findNode(*definition, stepID)
	if err != nil {
		return err
	}

	nowTs := pgtype.Timestamptz{Time: time.Now().UTC(), Valid: true}
	stepExecution, err := s.repo.GetStepExecution(ctx, execution.ID, node.ID)
	if err != nil {
		if !errors.Is(err, pgx.ErrNoRows) {
			return err
		}
		stepExecution, err = s.repo.CreateStepExecution(ctx, db.CreateWorkflowStepExecutionParams{
			ID:          uuid.New(),
			ExecutionID: execution.ID,
			StepID:      node.ID,
			StepType:    string(node.Type),
			Status:      "running",
			Attempts:    1,
			InputJson:   cloneRaw(node.Config),
			StartedAt:   nowTs,
		})
		if err != nil {
			return err
		}
	} else {
		stepExecution, err = s.repo.UpdateStepExecutionState(ctx, db.UpdateWorkflowStepExecutionStateParams{
			ExecutionID: execution.ID,
			StepID:      node.ID,
			Status:      "running",
			Attempts:    stepExecution.Attempts + 1,
			InputJson:   firstNonEmpty(stepExecution.InputJson, cloneRaw(node.Config)),
			OutputJson:  stepExecution.OutputJson,
			ErrorJson:   nil,
			StartedAt:   nowTs,
		})
		if err != nil {
			return err
		}
	}

	if _, err := s.repo.UpdateExecutionState(ctx, execution.ID, environmentID, "running", &node.ID, pgtype.Timestamptz{}, pgtype.Timestamptz{}); err != nil {
		return err
	}

	switch node.Type {
	case WorkflowStepTypeTrigger:
		return s.completeCurrentAndDispatchNext(ctx, execution, stepExecution, *definition, node, nextNodeIDs(*definition, node.ID, ""), nil)
	case WorkflowStepTypeDelay:
		return s.handleDelayStep(ctx, execution, stepExecution, *definition, node)
	case WorkflowStepTypeCondition:
		return s.handleConditionStep(ctx, execution, stepExecution, *definition, node)
	case WorkflowStepTypeNotification:
		return s.handleNotificationStep(ctx, execution, stepExecution, *definition, node)
	default:
		return s.failCurrentStep(ctx, execution, stepExecution, ErrInvalidWorkflow)
	}
}

func (s *Service) handleNotificationStep(ctx context.Context, execution db.WorkflowExecution, stepExecution db.WorkflowStepExecution, definition Definition, node Node) error {
	if !execution.SubscriberID.Valid {
		return s.failCurrentStep(ctx, execution, stepExecution, fmt.Errorf("workflow notification step requires subscriber_id"))
	}
	if s.producer == nil {
		return s.failCurrentStep(ctx, execution, stepExecution, fmt.Errorf("workflow step producer is not configured"))
	}

	var config NotificationConfig
	if err := json.Unmarshal(node.Config, &config); err != nil {
		return s.failCurrentStep(ctx, execution, stepExecution, ErrInvalidWorkflow)
	}
	channels, err := normalizeChannels(config.Channels)
	if err != nil || len(channels) != 1 {
		return s.failCurrentStep(ctx, execution, stepExecution, fmt.Errorf("workflow notification step currently supports exactly one channel"))
	}
	templateID, err := uuid.Parse(strings.TrimSpace(config.TemplateID))
	if err != nil {
		return s.failCurrentStep(ctx, execution, stepExecution, fmt.Errorf("workflow notification step requires a valid template_id"))
	}
	subscriberID := uuid.UUID(execution.SubscriberID.Bytes)
	subscriberRecord, err := s.repo.GetSubscriberByID(ctx, subscriberID, execution.EnvironmentID)
	if err != nil {
		return s.failCurrentStep(ctx, execution, stepExecution, err)
	}
	templateRecord, err := s.repo.GetTemplateByID(ctx, templateID, execution.EnvironmentID)
	if err != nil {
		return s.failCurrentStep(ctx, execution, stepExecution, err)
	}
	if !templateRecord.IsActive {
		return s.failCurrentStep(ctx, execution, stepExecution, fmt.Errorf("workflow notification template is inactive"))
	}
	channel := channels[0]
	if templateRecord.Channel != channel {
		return s.failCurrentStep(ctx, execution, stepExecution, fmt.Errorf("workflow notification template channel mismatch"))
	}

	vars, err := buildRuntimeRenderVariables(execution.TriggerPayload, subscriberRecord)
	if err != nil {
		return s.failCurrentStep(ctx, execution, stepExecution, err)
	}
	content, err := renderRuntimeChannelContent(templateRecord, node.ID, vars)
	if err != nil {
		return s.failCurrentStep(ctx, execution, stepExecution, err)
	}
	recipient, err := buildRuntimeRecipient(subscriberRecord, channel)
	if err != nil {
		return s.failCurrentStep(ctx, execution, stepExecution, err)
	}

	notificationJob := &types.NotificationJob{
		JobID:        uuid.NewString(),
		ProjectID:    execution.EnvironmentID.String(),
		WorkflowID:   execution.WorkflowID.String(),
		SubscriberID: subscriberRecord.ID.String(),
		Title:        content.Title,
		Message:      content.Message,
		Channels:     []string{channel},
		ChannelContent: map[string]types.ChannelContent{
			channel: content,
		},
		Recipient: recipient,
		Metadata: map[string]string{
			"workflow_execution_id": execution.ID.String(),
			"workflow_step_id":      node.ID,
			"subscriber_id":         subscriberRecord.ID.String(),
		},
	}
	if err := s.producer.Enqueue(ctx, notificationJob); err != nil {
		return s.failCurrentStep(ctx, execution, stepExecution, err)
	}

	output, _ := json.Marshal(map[string]any{"notification_job_id": notificationJob.JobID, "channel": channel})
	return s.completeCurrentAndDispatchNext(ctx, execution, stepExecution, definition, node, nextNodeIDs(definition, node.ID, ""), output)
}

func (s *Service) handleDelayStep(ctx context.Context, execution db.WorkflowExecution, stepExecution db.WorkflowStepExecution, definition Definition, node Node) error {
	var config DelayConfig
	if err := json.Unmarshal(node.Config, &config); err != nil {
		return s.failCurrentStep(ctx, execution, stepExecution, ErrInvalidWorkflow)
	}
	duration, err := time.ParseDuration(strings.TrimSpace(config.Duration))
	if err != nil {
		return s.failCurrentStep(ctx, execution, stepExecution, ErrInvalidWorkflow)
	}

	nextNodes := nextNodeIDs(definition, node.ID, "")
	if len(nextNodes) == 0 {
		return s.completeCurrentAndDispatchNext(ctx, execution, stepExecution, definition, node, nil, nil)
	}
	if s.producer == nil {
		return s.failCurrentStep(ctx, execution, stepExecution, fmt.Errorf("workflow step producer is not configured"))
	}

	for _, nextStepID := range nextNodes {
		if err := s.producer.EnqueueWorkflowStepIn(ctx, &types.WorkflowStepJob{
			EnvironmentID: execution.EnvironmentID.String(),
			ExecutionID:   execution.ID.String(),
			WorkflowID:    execution.WorkflowID.String(),
			StepID:        nextStepID,
		}, duration); err != nil {
			return s.failCurrentStep(ctx, execution, stepExecution, err)
		}
	}
	meta, _ := json.Marshal(map[string]any{"duration": duration.String(), "next_steps": nextNodes})
	nowTs := pgtype.Timestamptz{Time: time.Now().UTC(), Valid: true}
	if _, err := s.repo.UpdateStepExecutionState(ctx, db.UpdateWorkflowStepExecutionStateParams{
		ExecutionID: execution.ID,
		StepID:      node.ID,
		Status:      "completed",
		Attempts:    stepExecution.Attempts,
		InputJson:   stepExecution.InputJson,
		OutputJson:  meta,
		StartedAt:   stepExecution.StartedAt,
		CompletedAt: nowTs,
	}); err != nil {
		return err
	}
	nextCurrentStepID := nextNodes[0]
	_, err = s.repo.UpdateExecutionState(ctx, execution.ID, execution.EnvironmentID, "queued", &nextCurrentStepID, pgtype.Timestamptz{}, pgtype.Timestamptz{})
	return err
}

func (s *Service) handleConditionStep(ctx context.Context, execution db.WorkflowExecution, stepExecution db.WorkflowStepExecution, definition Definition, node Node) error {
	var config ConditionConfig
	if err := json.Unmarshal(node.Config, &config); err != nil {
		return s.failCurrentStep(ctx, execution, stepExecution, ErrInvalidWorkflow)
	}
	matched, err := evaluateCondition(execution.TriggerPayload, config)
	if err != nil {
		return s.failCurrentStep(ctx, execution, stepExecution, err)
	}
	branch := "false"
	if matched {
		branch = "true"
	}
	nextNodes := nextNodeIDs(definition, node.ID, branch)
	meta, _ := json.Marshal(map[string]any{"matched": matched, "branch": branch, "next_steps": nextNodes})
	return s.completeCurrentAndDispatchNext(ctx, execution, stepExecution, definition, node, nextNodes, meta)
}

func (s *Service) completeCurrentAndDispatchNext(ctx context.Context, execution db.WorkflowExecution, stepExecution db.WorkflowStepExecution, definition Definition, node Node, nextNodes []string, output []byte) error {
	nowTs := pgtype.Timestamptz{Time: time.Now().UTC(), Valid: true}
	if _, err := s.repo.UpdateStepExecutionState(ctx, db.UpdateWorkflowStepExecutionStateParams{
		ExecutionID: execution.ID,
		StepID:      node.ID,
		Status:      "completed",
		Attempts:    stepExecution.Attempts,
		InputJson:   stepExecution.InputJson,
		OutputJson:  output,
		StartedAt:   stepExecution.StartedAt,
		CompletedAt: nowTs,
	}); err != nil {
		return err
	}

	if len(nextNodes) == 0 {
		_, err := s.repo.UpdateExecutionState(ctx, execution.ID, execution.EnvironmentID, "completed", nil, nowTs, pgtype.Timestamptz{})
		return err
	}

	if s.producer == nil {
		return fmt.Errorf("workflow step producer is not configured")
	}
	for _, nextStepID := range nextNodes {
		if err := s.producer.EnqueueWorkflowStep(ctx, &types.WorkflowStepJob{
			EnvironmentID: execution.EnvironmentID.String(),
			ExecutionID:   execution.ID.String(),
			WorkflowID:    execution.WorkflowID.String(),
			StepID:        nextStepID,
		}); err != nil {
			return err
		}
	}
	nextCurrentStepID := nextNodes[0]
	_, err := s.repo.UpdateExecutionState(ctx, execution.ID, execution.EnvironmentID, "queued", &nextCurrentStepID, pgtype.Timestamptz{}, pgtype.Timestamptz{})
	return err
}

func (s *Service) failCurrentStep(ctx context.Context, execution db.WorkflowExecution, stepExecution db.WorkflowStepExecution, cause error) error {
	nowTs := pgtype.Timestamptz{Time: time.Now().UTC(), Valid: true}
	errorJSON, _ := json.Marshal(map[string]string{"error": cause.Error()})
	if _, err := s.repo.UpdateStepExecutionState(ctx, db.UpdateWorkflowStepExecutionStateParams{
		ExecutionID: execution.ID,
		StepID:      stepExecution.StepID,
		Status:      "failed",
		Attempts:    stepExecution.Attempts,
		InputJson:   stepExecution.InputJson,
		OutputJson:  stepExecution.OutputJson,
		ErrorJson:   errorJSON,
		StartedAt:   stepExecution.StartedAt,
		FailedAt:    nowTs,
	}); err != nil {
		return err
	}
	if _, err := s.repo.UpdateExecutionState(ctx, execution.ID, execution.EnvironmentID, "failed", &stepExecution.StepID, pgtype.Timestamptz{}, nowTs); err != nil {
		return err
	}
	return cause
}

func findNode(definition Definition, nodeID string) (Node, error) {
	for _, node := range definition.Nodes {
		if node.ID == nodeID {
			return node, nil
		}
	}
	return Node{}, ErrInvalidWorkflow
}

func nextNodeIDs(definition Definition, nodeID, branch string) []string {
	result := make([]string, 0)
	for _, edge := range definition.Edges {
		if edge.Source != nodeID {
			continue
		}
		edgeBranch := strings.ToLower(strings.TrimSpace(edge.Branch))
		if branch != "" && edgeBranch != "" && edgeBranch != branch {
			continue
		}
		result = append(result, edge.Target)
	}
	return result
}

func evaluateCondition(triggerPayload []byte, config ConditionConfig) (bool, error) {
	var payload map[string]any
	if len(triggerPayload) > 0 {
		if err := json.Unmarshal(triggerPayload, &payload); err != nil {
			return false, err
		}
	}
	value, exists := lookupField(payload, config.Field)
	operator := strings.ToLower(strings.TrimSpace(config.Operator))
	switch operator {
	case "exists":
		return exists, nil
	case "equals":
		return exists && fmt.Sprint(value) == fmt.Sprint(config.Value), nil
	case "not_equals":
		return !exists || fmt.Sprint(value) != fmt.Sprint(config.Value), nil
	case "contains":
		if !exists {
			return false, nil
		}
		return strings.Contains(strings.ToLower(fmt.Sprint(value)), strings.ToLower(fmt.Sprint(config.Value))), nil
	default:
		return false, ErrInvalidWorkflow
	}
}

func lookupField(payload map[string]any, field string) (any, bool) {
	current := any(payload)
	for _, part := range strings.Split(strings.TrimSpace(field), ".") {
		object, ok := current.(map[string]any)
		if !ok {
			return nil, false
		}
		next, ok := object[part]
		if !ok {
			return nil, false
		}
		current = next
	}
	return current, true
}

func cloneRaw(value json.RawMessage) []byte {
	if len(value) == 0 {
		return nil
	}
	cloned := make([]byte, len(value))
	copy(cloned, value)
	return cloned
}

func firstNonEmpty(primary, fallback []byte) []byte {
	if len(primary) != 0 {
		return primary
	}
	return fallback
}

func buildRuntimeRenderVariables(triggerPayload []byte, subscriber db.Subscriber) (map[string]any, error) {
	variables := map[string]any{
		"subscriber_id": subscriber.ID.String(),
		"name":          subscriber.Name,
		"tags":          subscriber.Tags,
		"reference":     subscriber.ID.String(),
	}
	if subscriber.Email != nil {
		variables["email"] = strings.TrimSpace(*subscriber.Email)
	}
	if subscriber.Phone != nil {
		variables["phone"] = strings.TrimSpace(*subscriber.Phone)
	}
	if subscriber.PushToken != nil {
		variables["push_token"] = strings.TrimSpace(*subscriber.PushToken)
	}

	if len(triggerPayload) == 0 {
		return variables, nil
	}
	var payload map[string]any
	if err := json.Unmarshal(triggerPayload, &payload); err != nil {
		return nil, err
	}
	if eventName, ok := payload["event"].(string); ok {
		variables["event"] = eventName
	}
	if data, ok := payload["data"].(map[string]any); ok {
		variables["data"] = data
		for key, value := range data {
			variables[key] = value
		}
	}
	return variables, nil
}

func renderRuntimeChannelContent(templateRecord db.Template, fallbackTitle string, variables map[string]any) (types.ChannelContent, error) {
	subject := ""
	if templateRecord.Subject != nil {
		subject = *templateRecord.Subject
	}
	rendered, err := templates.Render(subject, templateRecord.Body, variables)
	if err != nil {
		return types.ChannelContent{}, err
	}
	title := strings.TrimSpace(rendered.Subject)
	if title == "" {
		title = fallbackTitle
	}
	return types.ChannelContent{Title: title, Message: rendered.Body}, nil
}

func buildRuntimeRecipient(subscriber db.Subscriber, channel string) (types.Recipient, error) {
	recipient := types.Recipient{Reference: subscriber.ID.String()}
	switch channel {
	case "email":
		if subscriber.Email == nil || strings.TrimSpace(*subscriber.Email) == "" {
			return types.Recipient{}, fmt.Errorf("subscriber has no email target")
		}
		recipient.Email = strings.TrimSpace(*subscriber.Email)
	case "sms":
		if subscriber.Phone == nil || strings.TrimSpace(*subscriber.Phone) == "" {
			return types.Recipient{}, fmt.Errorf("subscriber has no phone target")
		}
		recipient.PhoneNumber = strings.TrimSpace(*subscriber.Phone)
	case "push":
		if subscriber.PushToken == nil || strings.TrimSpace(*subscriber.PushToken) == "" {
			return types.Recipient{}, fmt.Errorf("subscriber has no push target")
		}
		recipient.PushTokens = []string{strings.TrimSpace(*subscriber.PushToken)}
	default:
		return types.Recipient{}, fmt.Errorf("unsupported notification channel")
	}
	return recipient, nil
}

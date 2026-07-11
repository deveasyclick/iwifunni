package workflow

import (
	"context"
	"encoding/json"
	"errors"
	"regexp"
	"strings"
	"time"

	"github.com/deveasyclick/iwifunni/internal/db/gen"
	"github.com/deveasyclick/iwifunni/internal/types"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

var (
	ErrInvalidWorkflow      = errors.New("invalid workflow")
	ErrInvalidWorkflowEvent = errors.New("invalid workflow event")
	workflowKeyPattern            = regexp.MustCompile(`^[a-zA-Z0-9_-]+$`)
)

type CreateInput struct {
	EnvironmentID uuid.UUID
	Key           string
	Name          string
	Description   *string
	Channels      []string
	TemplateIDs   map[string]string
	Definition    *Definition
}

type UpdateInput struct {
	ID            uuid.UUID
	EnvironmentID uuid.UUID
	Key           string
	Name          string
	Description   *string
	Channels      []string
	TemplateIDs   map[string]string
	IsActive      bool
	Definition    *Definition
}

type TriggerEventInput struct {
	Event        string
	SubscriberID string
	Data         map[string]any
}

type workflowRepository interface {
	CreateDefinition(context.Context, db.CreateWorkflowDefinitionParams) (db.Workflow, error)
	GetActiveByTriggerEvent(context.Context, uuid.UUID, string) ([]db.Workflow, error)
	Create(context.Context, db.CreateWorkflowParams) (db.Workflow, error)
	CreateExecution(context.Context, db.CreateWorkflowExecutionParams) (db.WorkflowExecution, error)
	List(context.Context, uuid.UUID) ([]db.Workflow, error)
	GetByID(context.Context, uuid.UUID, uuid.UUID) (db.Workflow, error)
	ListExecutions(context.Context, uuid.UUID, *uuid.UUID) ([]db.WorkflowExecution, error)
	GetExecutionByID(context.Context, uuid.UUID, uuid.UUID) (db.WorkflowExecution, error)
	GetSubscriberByID(context.Context, uuid.UUID, uuid.UUID) (db.Subscriber, error)
	GetTemplateByID(context.Context, uuid.UUID, uuid.UUID) (db.Template, error)
	GetStepExecution(context.Context, uuid.UUID, string) (db.WorkflowStepExecution, error)
	CreateStepExecution(context.Context, db.CreateWorkflowStepExecutionParams) (db.WorkflowStepExecution, error)
	UpdateStepExecutionState(context.Context, db.UpdateWorkflowStepExecutionStateParams) (db.WorkflowStepExecution, error)
	UpdateExecutionState(context.Context, uuid.UUID, uuid.UUID, string, *string, pgtype.Timestamptz, pgtype.Timestamptz) (db.WorkflowExecution, error)
	ListStepExecutionsByExecution(context.Context, uuid.UUID) ([]db.WorkflowStepExecution, error)
	Update(context.Context, db.UpdateWorkflowParams) (db.Workflow, error)
	UpdateDefinition(context.Context, db.UpdateWorkflowDefinitionParams) (db.Workflow, error)
	UpdateStatus(context.Context, db.UpdateWorkflowStatusParams) (db.Workflow, error)
	Delete(context.Context, uuid.UUID, uuid.UUID) error
}

type Service struct {
	repo     workflowRepository
	producer workflowStepProducer
}

type workflowStepProducer interface {
	Enqueue(context.Context, *types.NotificationJob) error
	EnqueueWorkflowStep(context.Context, *types.WorkflowStepJob) error
	EnqueueWorkflowStepIn(context.Context, *types.WorkflowStepJob, time.Duration) error
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) WithProducer(producer workflowStepProducer) *Service {
	s.producer = producer
	return s
}

func (s *Service) Create(ctx context.Context, in CreateInput) (db.Workflow, error) {
	if in.Definition != nil {
		params, err := buildCreateDefinitionParams(in)
		if err != nil {
			return db.Workflow{}, err
		}
		return s.repo.CreateDefinition(ctx, params)
	}

	params, err := buildCreateParams(in)
	if err != nil {
		return db.Workflow{}, err
	}
	return s.repo.Create(ctx, params)
}

func (s *Service) List(ctx context.Context, environmentID uuid.UUID) ([]db.Workflow, error) {
	return s.repo.List(ctx, environmentID)
}

func (s *Service) GetByID(ctx context.Context, id, environmentID uuid.UUID) (db.Workflow, error) {
	return s.repo.GetByID(ctx, id, environmentID)
}

func (s *Service) ListExecutions(ctx context.Context, environmentID uuid.UUID, workflowID *uuid.UUID) ([]db.WorkflowExecution, error) {
	return s.repo.ListExecutions(ctx, environmentID, workflowID)
}

func (s *Service) GetExecutionByID(ctx context.Context, id, environmentID uuid.UUID) (ExecutionDetail, error) {
	execution, err := s.repo.GetExecutionByID(ctx, id, environmentID)
	if err != nil {
		return ExecutionDetail{}, err
	}

	steps, err := s.repo.ListStepExecutionsByExecution(ctx, execution.ID)
	if err != nil {
		return ExecutionDetail{}, err
	}

	return ExecutionDetail{Execution: execution, Steps: steps}, nil
}

func (s *Service) Update(ctx context.Context, in UpdateInput) (db.Workflow, error) {
	if in.Definition != nil {
		current, err := s.repo.GetByID(ctx, in.ID, in.EnvironmentID)
		if err != nil {
			return db.Workflow{}, err
		}

		params, err := buildUpdateDefinitionParams(current, in)
		if err != nil {
			return db.Workflow{}, err
		}
		return s.repo.UpdateDefinition(ctx, params)
	}

	params, err := buildUpdateParams(in)
	if err != nil {
		return db.Workflow{}, err
	}
	return s.repo.Update(ctx, params)
}

func (s *Service) Delete(ctx context.Context, id, environmentID uuid.UUID) error {
	return s.repo.Delete(ctx, id, environmentID)
}

func (s *Service) Pause(ctx context.Context, id, environmentID uuid.UUID) (db.Workflow, error) {
	workflow, err := s.repo.GetByID(ctx, id, environmentID)
	if err != nil {
		return db.Workflow{}, err
	}
	if workflow.Status == string(WorkflowStatusPaused) {
		return workflow, nil
	}
	return s.repo.UpdateStatus(ctx, db.UpdateWorkflowStatusParams{
		ID:            id,
		EnvironmentID: environmentID,
		Status:        string(WorkflowStatusPaused),
	})
}

func (s *Service) Resume(ctx context.Context, id, environmentID uuid.UUID) (db.Workflow, error) {
	return s.repo.UpdateStatus(ctx, db.UpdateWorkflowStatusParams{
		ID:            id,
		EnvironmentID: environmentID,
		Status:        string(WorkflowStatusActive),
	})
}

func (s *Service) TriggerEvent(ctx context.Context, environmentID uuid.UUID, in TriggerEventInput) ([]db.WorkflowExecution, error) {
	eventName := strings.TrimSpace(in.Event)
	if eventName == "" {
		return nil, ErrInvalidWorkflowEvent
	}

	var subscriber pgtype.UUID
	if rawSubscriberID := strings.TrimSpace(in.SubscriberID); rawSubscriberID != "" {
		parsed, err := uuid.Parse(rawSubscriberID)
		if err != nil {
			return nil, ErrInvalidWorkflowEvent
		}
		subscriber = pgtype.UUID{Bytes: parsed, Valid: true}
	}

	workflows, err := s.repo.GetActiveByTriggerEvent(ctx, environmentID, eventName)
	if err != nil {
		return nil, err
	}

	payload, err := json.Marshal(map[string]any{
		"event":         eventName,
		"subscriber_id": strings.TrimSpace(in.SubscriberID),
		"data":          in.Data,
	})
	if err != nil {
		return nil, ErrInvalidWorkflowEvent
	}

	executions := make([]db.WorkflowExecution, 0, len(workflows))
	for _, workflowRecord := range workflows {
		nextStepID, err := firstStepID(workflowRecord.DefinitionJson)
		if err != nil {
			return nil, err
		}

		execution, err := s.repo.CreateExecution(ctx, db.CreateWorkflowExecutionParams{
			ID:             uuid.New(),
			WorkflowID:     workflowRecord.ID,
			EnvironmentID:  environmentID,
			SubscriberID:   subscriber,
			Status:         "queued",
			CurrentStepID:  nextStepID,
			TriggerPayload: payload,
		})
		if err != nil {
			return nil, err
		}
		if s.producer != nil && nextStepID != nil {
			if err := s.producer.EnqueueWorkflowStep(ctx, &types.WorkflowStepJob{
				EnvironmentID: environmentID.String(),
				ExecutionID: execution.ID.String(),
				WorkflowID:  workflowRecord.ID.String(),
				StepID:      *nextStepID,
			}); err != nil {
				return nil, err
			}
		}
		executions = append(executions, execution)
	}

	return executions, nil
}

func buildCreateParams(in CreateInput) (db.CreateWorkflowParams, error) {
	key, name, description, channels, templateIDs, err := normalizeWorkflowInput(in.Key, in.Name, in.Description, in.Channels, in.TemplateIDs)
	if err != nil {
		return db.CreateWorkflowParams{}, err
	}
	return db.CreateWorkflowParams{
		ID:            uuid.New(),
		EnvironmentID: in.EnvironmentID,
		Key:           key,
		Name:          name,
		Description:   description,
		Channels:      channels,
		TemplateIds:   templateIDs,
	}, nil
}

func buildCreateDefinitionParams(in CreateInput) (db.CreateWorkflowDefinitionParams, error) {
	key, name, description, triggerEvent, definitionJSON, err := normalizeWorkflowDefinitionInput(in.Key, in.Name, in.Description, in.Definition)
	if err != nil {
		return db.CreateWorkflowDefinitionParams{}, err
	}

	channels := channelsFromDefinition(in.Definition)
	normalizedChannels, err := normalizeChannels(channels)
	if err != nil {
		return db.CreateWorkflowDefinitionParams{}, err
	}

	return db.CreateWorkflowDefinitionParams{
		ID:             uuid.New(),
		EnvironmentID:  in.EnvironmentID,
		Key:            key,
		Name:           name,
		Description:    description,
		Channels:       normalizedChannels,
		TemplateIds:    nil,
		Status:         string(WorkflowStatusDraft),
		Version:        1,
		TriggerEvent:   triggerEvent,
		DefinitionJson: definitionJSON,
	}, nil
}

func buildUpdateParams(in UpdateInput) (db.UpdateWorkflowParams, error) {
	key, name, description, channels, templateIDs, err := normalizeWorkflowInput(in.Key, in.Name, in.Description, in.Channels, in.TemplateIDs)
	if err != nil {
		return db.UpdateWorkflowParams{}, err
	}
	return db.UpdateWorkflowParams{
		ID:            in.ID,
		EnvironmentID: in.EnvironmentID,
		Key:           key,
		Name:          name,
		Description:   description,
		Channels:      channels,
		TemplateIds:   templateIDs,
		IsActive:      in.IsActive,
	}, nil
}

func buildUpdateDefinitionParams(current db.Workflow, in UpdateInput) (db.UpdateWorkflowDefinitionParams, error) {
	key, name, description, triggerEvent, definitionJSON, err := normalizeWorkflowDefinitionInput(in.Key, in.Name, in.Description, in.Definition)
	if err != nil {
		return db.UpdateWorkflowDefinitionParams{}, err
	}

	channels := channelsFromDefinition(in.Definition)
	normalizedChannels, err := normalizeChannels(channels)
	if err != nil {
		return db.UpdateWorkflowDefinitionParams{}, err
	}

	return db.UpdateWorkflowDefinitionParams{
		ID:             current.ID,
		EnvironmentID:  current.EnvironmentID,
		Key:            key,
		Name:           name,
		Description:    description,
		Channels:       normalizedChannels,
		TemplateIds:    nil,
		Status:         string(WorkflowStatusActive),
		Version:        current.Version,
		TriggerEvent:   triggerEvent,
		DefinitionJson: definitionJSON,
	}, nil
}

func normalizeWorkflowInput(key, name string, description *string, channels []string, templateIDs map[string]string) (string, string, *string, []string, []byte, error) {
	normalizedKey := strings.TrimSpace(key)
	normalizedName := strings.TrimSpace(name)
	if normalizedKey == "" || normalizedName == "" || !workflowKeyPattern.MatchString(normalizedKey) {
		return "", "", nil, nil, nil, ErrInvalidWorkflow
	}
	normalizedChannels, err := normalizeChannels(channels)
	if err != nil {
		return "", "", nil, nil, nil, err
	}
	normalizedDescription := trimOptional(description)
	normalizedTemplateIDs, err := normalizeTemplateIDs(templateIDs, normalizedChannels)
	if err != nil {
		return "", "", nil, nil, nil, err
	}
	return normalizedKey, normalizedName, normalizedDescription, normalizedChannels, normalizedTemplateIDs, nil
}

func normalizeWorkflowDefinitionInput(key, name string, description *string, definition *Definition) (string, string, *string, *string, []byte, error) {
	if definition == nil {
		return "", "", nil, nil, nil, ErrInvalidWorkflow
	}

	normalizedKey := strings.TrimSpace(key)
	normalizedName := strings.TrimSpace(name)
	if normalizedKey == "" || normalizedName == "" || !workflowKeyPattern.MatchString(normalizedKey) {
		return "", "", nil, nil, nil, ErrInvalidWorkflow
	}
	if err := ValidateDefinition(*definition); err != nil {
		return "", "", nil, nil, nil, err
	}

	definitionJSON, err := marshalDefinition(*definition)
	if err != nil {
		return "", "", nil, nil, nil, ErrInvalidWorkflow
	}

	return normalizedKey, normalizedName, trimOptional(description), trimOptional(&definition.Trigger.Event), definitionJSON, nil
}

// channelsFromDefinition extracts unique channel names from notification
// nodes in the workflow definition.
func channelsFromDefinition(definition *Definition) []string {
	if definition == nil {
		return nil
	}
	seen := make(map[string]struct{})
	var result []string
	for _, node := range definition.Nodes {
		if node.Type != WorkflowStepTypeNotification {
			continue
		}
		var cfg NotificationConfig
		if err := json.Unmarshal(node.Config, &cfg); err != nil {
			continue
		}
		for _, ch := range cfg.Channels {
			if ch == "" {
				continue
			}
			if _, ok := seen[ch]; !ok {
				seen[ch] = struct{}{}
				result = append(result, ch)
			}
		}
	}
	return result
}

func normalizeChannels(channels []string) ([]string, error) {
	if len(channels) == 0 {
		return nil, ErrInvalidWorkflow
	}
	seen := make(map[string]struct{}, len(channels))
	result := make([]string, 0, len(channels))
	for _, channel := range channels {
		normalized := strings.ToLower(strings.TrimSpace(channel))
		switch normalized {
		case "email", "sms", "push":
		default:
			return nil, ErrInvalidWorkflow
		}
		if _, ok := seen[normalized]; ok {
			continue
		}
		seen[normalized] = struct{}{}
		result = append(result, normalized)
	}
	if len(result) == 0 {
		return nil, ErrInvalidWorkflow
	}
	return result, nil
}

func normalizeTemplateIDs(templateIDs map[string]string, channels []string) ([]byte, error) {
	allowed := make(map[string]struct{}, len(channels))
	for _, channel := range channels {
		allowed[channel] = struct{}{}
	}
	normalized := make(map[string]string, len(templateIDs))
	for channel, templateID := range templateIDs {
		normalizedChannel := strings.ToLower(strings.TrimSpace(channel))
		if _, ok := allowed[normalizedChannel]; !ok {
			return nil, ErrInvalidWorkflow
		}
		normalizedTemplateID := strings.TrimSpace(templateID)
		if normalizedTemplateID == "" {
			continue
		}
		if _, err := uuid.Parse(normalizedTemplateID); err != nil {
			return nil, ErrInvalidWorkflow
		}
		normalized[normalizedChannel] = normalizedTemplateID
	}
	return json.Marshal(normalized)
}

func trimOptional(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func firstStepID(rawDefinition []byte) (*string, error) {
	definition, err := parseDefinition(rawDefinition)
	if err != nil || definition == nil {
		return nil, err
	}

	incoming := make(map[string]int, len(definition.Nodes))
	for _, node := range definition.Nodes {
		incoming[node.ID] = 0
	}
	for _, edge := range definition.Edges {
		if _, ok := incoming[edge.Target]; ok {
			incoming[edge.Target]++
		}
	}

	for _, node := range definition.Nodes {
		if incoming[node.ID] == 0 {
			first := node.ID
			return &first, nil
		}
	}

	return nil, nil
}

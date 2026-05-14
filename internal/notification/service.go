package notification

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/deveasyclick/iwifunni/internal/db"
	"github.com/deveasyclick/iwifunni/internal/registry"
	"github.com/deveasyclick/iwifunni/internal/templates"
	"github.com/deveasyclick/iwifunni/internal/types"
	"github.com/deveasyclick/iwifunni/internal/webhooks"
	"github.com/deveasyclick/iwifunni/pkg/logger"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

var ErrInvalidSendRequest = errors.New("invalid notification request")

type NotificationView struct {
	ID        string         `json:"id"`
	ServiceID *string        `json:"service_id,omitempty"`
	ProjectID *string        `json:"project_id,omitempty"`
	Title     string         `json:"title"`
	Message   string         `json:"message"`
	Channels  []string       `json:"channels"`
	Metadata  map[string]any `json:"metadata"`
	Status    string         `json:"status"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
}

// Service handles notification delivery logic.
type Service struct {
	repo       *Repository
	registry   *registry.Registry
	dispatcher *webhooks.Dispatcher
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo, registry: registry.NewDefault()}
}

func NewServiceWithWebhooks(repo *Repository, dispatcher *webhooks.Dispatcher) *Service {
	return &Service{repo: repo, registry: registry.NewDefault(), dispatcher: dispatcher}
}

func (s *Service) PrepareJob(ctx context.Context, job *types.NotificationJob) (*types.NotificationJob, error) {
	if job == nil {
		return nil, invalidSend("notification payload is required")
	}

	prepared := *job
	prepared.Title = strings.TrimSpace(prepared.Title)
	prepared.Message = strings.TrimSpace(prepared.Message)
	prepared.WorkflowID = strings.TrimSpace(prepared.WorkflowID)
	prepared.SubscriberID = strings.TrimSpace(prepared.SubscriberID)

	if prepared.Title == "" || prepared.Message == "" {
		return nil, invalidSend("title and message are required")
	}

	if prepared.WorkflowID == "" && prepared.SubscriberID == "" {
		prepared.Channels = normalizeChannels(prepared.Channels)
		if len(prepared.Channels) == 0 {
			return nil, invalidSend("at least one channel is required")
		}
		if err := validateRecipientForChannels(prepared.Recipient, prepared.Channels); err != nil {
			return nil, err
		}
		return &prepared, nil
	}

	if prepared.WorkflowID == "" || prepared.SubscriberID == "" {
		return nil, invalidSend("workflow_id and subscriber_id must be provided together")
	}
	if prepared.ProjectID == "" {
		return nil, invalidSend("workflow-based sends require project-scoped authentication")
	}

	projectID, err := uuid.Parse(prepared.ProjectID)
	if err != nil {
		return nil, invalidSend("invalid project_id")
	}
	workflowID, err := uuid.Parse(prepared.WorkflowID)
	if err != nil {
		return nil, invalidSend("invalid workflow_id")
	}
	subscriberID, err := uuid.Parse(prepared.SubscriberID)
	if err != nil {
		return nil, invalidSend("invalid subscriber_id")
	}

	workflowRecord, err := s.repo.GetWorkflowByID(ctx, workflowID, projectID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("workflow not found: %w", err)
		}
		return nil, err
	}
	if !workflowRecord.IsActive {
		return nil, invalidSend("workflow is inactive")
	}

	subscriberRecord, err := s.repo.GetSubscriberByID(ctx, subscriberID, projectID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("subscriber not found: %w", err)
		}
		return nil, err
	}

	prepared.Channels = append([]string(nil), workflowRecord.Channels...)
	prepared.Channels, prepared.ChannelContent, prepared.SkippedChannels, prepared.Recipient, err = s.prepareWorkflowDelivery(ctx, projectID, workflowRecord, subscriberRecord, prepared)
	if err != nil {
		return nil, err
	}
	prepared.Metadata = enrichMetadata(prepared.Metadata, workflowRecord, subscriberRecord)

	return &prepared, nil
}

func (s *Service) Send(ctx context.Context, job *types.NotificationJob) error {
	prepared, err := s.PrepareJob(ctx, job)
	if err != nil {
		return err
	}
	job = prepared

	notificationID := uuid.New()
	recipient, err := json.Marshal(job.Recipient)
	if err != nil {
		return err
	}
	metadata, err := json.Marshal(job.Metadata)
	if err != nil {
		return err
	}
	nowTs := pgtype.Timestamptz{Time: now(), Valid: true}

	// Project-based path
	if job.ProjectID != "" {
		projectID, err := uuid.Parse(job.ProjectID)
		if err != nil {
			return fmt.Errorf("invalid project_id: %w", err)
		}
		if err := s.repo.InsertByProject(ctx, db.InsertNotificationByProjectParams{
			ID:        notificationID,
			ProjectID: pgtype.UUID{Bytes: projectID, Valid: true},
			Title:     job.Title,
			Message:   job.Message,
			Channels:  job.Channels,
			Recipient: recipient,
			Metadata:  metadata,
			Status:    "pending",
			CreatedAt: nowTs,
			UpdatedAt: nowTs,
		}); err != nil {
			return err
		}

		successCount, failureCount, skippedCount := 0, 0, len(job.SkippedChannels)
		for _, skipped := range job.SkippedChannels {
			if err := s.recordSkipped(ctx, notificationID, skipped.Channel, skipped.Reason); err != nil {
				logger.Get().Warn().Err(err).Str("channel", skipped.Channel).Msg("failed to record skipped delivery attempt")
			}
		}
		for _, channel := range job.Channels {
			if err := s.deliverProjectChannel(ctx, projectID, notificationID, channel, job); err != nil {
				logger.Get().Warn().Err(err).Str("channel", channel).Msg("delivery attempt failed")
				failureCount++
			} else {
				successCount++
			}
		}

		status := finalNotificationStatus(successCount, failureCount, skippedCount)
		if err := s.repo.UpdateStatus(ctx, notificationID, status, pgtype.Timestamptz{Time: now(), Valid: true}); err != nil {
			return err
		}
		if s.dispatcher != nil {
			event := "notification.sent"
			if status == "failed" || status == "skipped" {
				event = "notification.failed"
			}
			s.dispatcher.Dispatch(ctx, projectID, event, webhooks.EventPayload{
				Event:          event,
				NotificationID: notificationID.String(),
				ProjectID:      projectID.String(),
				Timestamp:      now().Format(time.RFC3339),
			})
		}
		return nil
	}

	// Legacy service-based path
	serviceID, err := uuid.Parse(job.ServiceID)
	if err != nil {
		return err
	}
	if err := s.repo.Insert(ctx, db.InsertNotificationParams{
		ID:        notificationID,
		ServiceID: serviceID,
		Title:     job.Title,
		Message:   job.Message,
		Channels:  job.Channels,
		Recipient: recipient,
		Metadata:  metadata,
		Status:    "pending",
		CreatedAt: nowTs,
		UpdatedAt: nowTs,
	}); err != nil {
		return err
	}

	successCount, failureCount := 0, 0
	for _, channel := range job.Channels {
		if err := s.deliverChannel(ctx, serviceID, notificationID, channel, job); err != nil {
			logger.Get().Warn().Err(err).Str("channel", channel).Msg("delivery attempt failed")
			failureCount++
		} else {
			successCount++
		}
	}

	status := finalNotificationStatus(successCount, failureCount, 0)
	return s.repo.UpdateStatus(ctx, notificationID, status, pgtype.Timestamptz{Time: now(), Valid: true})
}

func invalidSend(message string) error {
	return fmt.Errorf("%w: %s", ErrInvalidSendRequest, message)
}

func normalizeChannels(channels []string) []string {
	seen := make(map[string]struct{}, len(channels))
	result := make([]string, 0, len(channels))
	for _, channel := range channels {
		normalized := strings.ToLower(strings.TrimSpace(channel))
		switch normalized {
		case "email", "sms", "push":
		default:
			continue
		}
		if _, ok := seen[normalized]; ok {
			continue
		}
		seen[normalized] = struct{}{}
		result = append(result, normalized)
	}
	return result
}

func validateRecipientForChannels(recipient types.Recipient, channels []string) error {
	for _, channel := range channels {
		switch channel {
		case "email":
			if strings.TrimSpace(recipient.Email) == "" {
				return invalidSend("email recipient is required for email channel")
			}
		case "sms":
			if strings.TrimSpace(recipient.PhoneNumber) == "" {
				return invalidSend("phone_number is required for sms channel")
			}
		case "push":
			if len(recipient.PushTokens) == 0 {
				return invalidSend("push_tokens are required for push channel")
			}
		}
	}
	return nil
}

type subscriberChannelStatus struct {
	Email string `json:"email,omitempty"`
	SMS   string `json:"sms,omitempty"`
	Push  string `json:"push,omitempty"`
}

func (s *Service) prepareWorkflowDelivery(ctx context.Context, projectID uuid.UUID, workflowRecord db.Workflow, subscriberRecord db.Subscriber, prepared types.NotificationJob) ([]string, map[string]types.ChannelContent, []types.SkippedChannel, types.Recipient, error) {
	templateIDs, err := parseWorkflowTemplateIDs(workflowRecord.TemplateIds)
	if err != nil {
		return nil, nil, nil, types.Recipient{}, invalidSend("workflow template mapping is invalid")
	}

	channelStatus := parseSubscriberChannelStatus(subscriberRecord.Status)
	renderVars := buildWorkflowRenderVariables(prepared.Metadata, subscriberRecord)
	recipient := types.Recipient{Reference: subscriberRecord.ID.String()}
	deliverableChannels := make([]string, 0, len(workflowRecord.Channels))
	channelContent := make(map[string]types.ChannelContent, len(workflowRecord.Channels))
	skippedChannels := make([]types.SkippedChannel, 0)

	for _, channel := range workflowRecord.Channels {
		if reason, skip := skipReasonForSubscriberChannel(channel, channelStatus); skip {
			skippedChannels = append(skippedChannels, types.SkippedChannel{Channel: channel, Reason: reason})
			continue
		}

		templateIDValue, ok := templateIDs[channel]
		if !ok || strings.TrimSpace(templateIDValue) == "" {
			skippedChannels = append(skippedChannels, types.SkippedChannel{Channel: channel, Reason: "workflow channel has no linked template"})
			continue
		}

		templateID, err := uuid.Parse(strings.TrimSpace(templateIDValue))
		if err != nil {
			return nil, nil, nil, types.Recipient{}, invalidSend("workflow template mapping contains an invalid template id")
		}

		templateRecord, err := s.repo.GetTemplateByID(ctx, templateID, projectID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				skippedChannels = append(skippedChannels, types.SkippedChannel{Channel: channel, Reason: "linked template not found"})
				continue
			}
			return nil, nil, nil, types.Recipient{}, err
		}
		if !templateRecord.IsActive {
			skippedChannels = append(skippedChannels, types.SkippedChannel{Channel: channel, Reason: "linked template is inactive"})
			continue
		}
		if templateRecord.Channel != channel {
			skippedChannels = append(skippedChannels, types.SkippedChannel{Channel: channel, Reason: "linked template channel mismatch"})
			continue
		}

		if reason, skip := appendRecipientChannel(&recipient, subscriberRecord, channel); skip {
			skippedChannels = append(skippedChannels, types.SkippedChannel{Channel: channel, Reason: reason})
			continue
		}

		renderedContent, err := renderWorkflowChannelContent(templateRecord, workflowRecord.Name, renderVars)
		if err != nil {
			return nil, nil, nil, types.Recipient{}, invalidSend(fmt.Sprintf("failed to render %s template: %v", channel, err))
		}

		deliverableChannels = append(deliverableChannels, channel)
		channelContent[channel] = renderedContent
	}

	return deliverableChannels, channelContent, skippedChannels, recipient, nil
}

func parseWorkflowTemplateIDs(raw []byte) (map[string]string, error) {
	if len(raw) == 0 {
		return map[string]string{}, nil
	}

	result := make(map[string]string)
	if err := json.Unmarshal(raw, &result); err != nil {
		return nil, err
	}
	return result, nil
}

func parseSubscriberChannelStatus(raw []byte) subscriberChannelStatus {
	status := subscriberChannelStatus{}
	if len(raw) > 0 {
		_ = json.Unmarshal(raw, &status)
	}
	return status
}

func skipReasonForSubscriberChannel(channel string, status subscriberChannelStatus) (string, bool) {
	var value string
	switch channel {
	case "email":
		value = strings.TrimSpace(status.Email)
	case "sms":
		value = strings.TrimSpace(status.SMS)
	case "push":
		value = strings.TrimSpace(status.Push)
	}

	switch value {
	case "unsubscribed":
		return "subscriber is unsubscribed for this channel", true
	case "bounced":
		return "subscriber is bounced for this channel", true
	default:
		return "", false
	}
}

func appendRecipientChannel(recipient *types.Recipient, subscriber db.Subscriber, channel string) (string, bool) {
	switch channel {
	case "email":
		if subscriber.Email == nil || strings.TrimSpace(*subscriber.Email) == "" {
			return "subscriber has no email target", true
		}
		recipient.Email = strings.TrimSpace(*subscriber.Email)
	case "sms":
		if subscriber.Phone == nil || strings.TrimSpace(*subscriber.Phone) == "" {
			return "subscriber has no phone target", true
		}
		recipient.PhoneNumber = strings.TrimSpace(*subscriber.Phone)
	case "push":
		if subscriber.PushToken == nil || strings.TrimSpace(*subscriber.PushToken) == "" {
			return "subscriber has no push target", true
		}
		recipient.PushTokens = []string{strings.TrimSpace(*subscriber.PushToken)}
	}

	return "", false
}

func buildWorkflowRenderVariables(metadata map[string]string, subscriber db.Subscriber) map[string]any {
	variables := make(map[string]any, len(metadata)+8)
	metadataCopy := make(map[string]string, len(metadata))
	for key, value := range metadata {
		variables[key] = value
		metadataCopy[key] = value
	}
	variables["metadata"] = metadataCopy
	variables["subscriber_id"] = subscriber.ID.String()
	variables["name"] = subscriber.Name
	variables["tags"] = subscriber.Tags
	variables["reference"] = subscriber.ID.String()
	if subscriber.Email != nil {
		variables["email"] = strings.TrimSpace(*subscriber.Email)
	}
	if subscriber.Phone != nil {
		variables["phone"] = strings.TrimSpace(*subscriber.Phone)
	}
	if subscriber.PushToken != nil {
		variables["push_token"] = strings.TrimSpace(*subscriber.PushToken)
	}
	return variables
}

func renderWorkflowChannelContent(templateRecord db.Template, fallbackTitle string, variables map[string]any) (types.ChannelContent, error) {
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

func enrichMetadata(metadata map[string]string, workflow db.Workflow, subscriber db.Subscriber) map[string]string {
	result := make(map[string]string, len(metadata)+3)
	for key, value := range metadata {
		result[key] = value
	}
	result["workflow_id"] = workflow.ID.String()
	result["workflow_key"] = workflow.Key
	result["subscriber_id"] = subscriber.ID.String()
	return result
}

func finalNotificationStatus(successCount, failureCount, skippedCount int) string {
	switch {
	case successCount == 0 && failureCount == 0 && skippedCount > 0:
		return "skipped"
	case successCount > 0 && failureCount == 0 && skippedCount > 0:
		return "partial_skipped"
	case successCount > 0 && failureCount == 0:
		return "sent"
	case successCount > 0:
		return "partial_failed"
	default:
		return "failed"
	}
}

func (s *Service) deliverProjectChannel(ctx context.Context, projectID, notificationID uuid.UUID, channel string, job *types.NotificationJob) error {
	providerRecord, err := s.repo.GetActiveProviderByChannel(ctx, projectID, channel)
	if err != nil {
		return s.recordFailed(ctx, notificationID, channel, "", fmt.Errorf("no active provider for channel %s: %w", channel, err))
	}
	p, ok := s.registry.Get(providerRecord.Name)
	if !ok || p.Channel() != channel {
		return s.recordFailed(ctx, notificationID, channel, "", fmt.Errorf("provider %s not registered for channel %s", providerRecord.Name, channel))
	}
	attempts, providerErr := p.Send(ctx, job, providerRecord.Config)
	for _, a := range attempts {
		if a.Err != nil {
			_ = s.recordFailed(ctx, notificationID, channel, a.Destination, a.Err)
			continue
		}
		_ = s.recordSuccess(ctx, notificationID, channel, a.Destination)
	}
	return providerErr
}

func (s *Service) recordSkipped(ctx context.Context, notificationID uuid.UUID, channel, reason string) error {
	message := reason
	return s.repo.InsertDeliveryAttempt(ctx, db.InsertDeliveryAttemptParams{
		ID:             uuid.New(),
		NotificationID: notificationID,
		Channel:        channel,
		Destination:    "",
		Status:         "skipped",
		ErrorMessage:   &message,
		AttemptedAt:    pgtype.Timestamptz{Time: now(), Valid: true},
	})
}

func (s *Service) deliverChannel(ctx context.Context, serviceID, notificationID uuid.UUID, channel string, job *types.NotificationJob) error {
	configRecord, err := s.repo.GetServiceChannelConfig(ctx, db.GetServiceChannelConfigParams{
		ServiceID: serviceID,
		Channel:   channel,
	})
	if err != nil {
		return s.recordFailed(ctx, notificationID, channel, "", fmt.Errorf("channel config not found: %w", err))
	}
	if !configRecord.Enabled {
		return s.recordFailed(ctx, notificationID, channel, "", fmt.Errorf("channel %s is disabled", channel))
	}
	providerName := configRecord.Provider
	if providerName == "" {
		providerName = defaultProviderForChannel(channel)
	}
	p, ok := s.registry.Get(providerName)
	if !ok || p.Channel() != channel {
		return s.recordFailed(ctx, notificationID, channel, "", fmt.Errorf("unsupported provider %s for channel %s", providerName, channel))
	}
	attempts, providerErr := p.Send(ctx, job, configRecord.ConfigJson)
	for _, a := range attempts {
		if a.Err != nil {
			_ = s.recordFailed(ctx, notificationID, channel, a.Destination, a.Err)
			continue
		}
		_ = s.recordSuccess(ctx, notificationID, channel, a.Destination)
	}
	return providerErr
}

func (s *Service) recordSuccess(ctx context.Context, notificationID uuid.UUID, channel, destination string) error {
	return s.repo.InsertDeliveryAttempt(ctx, db.InsertDeliveryAttemptParams{
		ID:             uuid.New(),
		NotificationID: notificationID,
		Channel:        channel,
		Destination:    destination,
		Status:         "sent",
		AttemptedAt:    pgtype.Timestamptz{Time: now(), Valid: true},
	})
}

func (s *Service) recordFailed(ctx context.Context, notificationID uuid.UUID, channel, destination string, attemptErr error) error {
	msg := attemptErr.Error()
	_ = s.repo.InsertDeliveryAttempt(ctx, db.InsertDeliveryAttemptParams{
		ID:             uuid.New(),
		NotificationID: notificationID,
		Channel:        channel,
		Destination:    destination,
		Status:         "failed",
		ErrorMessage:   &msg,
		AttemptedAt:    pgtype.Timestamptz{Time: now(), Valid: true},
	})
	return attemptErr
}

func now() time.Time { return time.Now().UTC() }

func defaultProviderForChannel(channel string) string {
	switch channel {
	case "email":
		return "smtp"
	case "sms":
		return "termii"
	case "push":
		return "fcm"
	default:
		return ""
	}
}

func (s *Service) ListByProject(ctx context.Context, projectID uuid.UUID) ([]NotificationView, error) {
	items, err := s.repo.ListByProject(ctx, projectID)
	if err != nil {
		return nil, err
	}
	result := make([]NotificationView, 0, len(items))
	for _, item := range items {
		result = append(result, notificationViewFromRecord(item))
	}
	return result, nil
}

func (s *Service) GetByProject(ctx context.Context, id, projectID uuid.UUID) (*NotificationView, error) {
	item, err := s.repo.GetByProject(ctx, id, projectID)
	if err != nil {
		return nil, err
	}
	view := notificationViewFromRecord(item)
	return &view, nil
}

func notificationViewFromRecord(item db.Notification) NotificationView {
	metadata := map[string]any{}
	if len(item.Metadata) > 0 {
		_ = json.Unmarshal(item.Metadata, &metadata)
	}

	var serviceID *string
	if item.ServiceID != uuid.Nil {
		value := item.ServiceID.String()
		serviceID = &value
	}

	var projectID *string
	if item.ProjectID.Valid {
		value := uuid.UUID(item.ProjectID.Bytes).String()
		projectID = &value
	}

	return NotificationView{
		ID:        item.ID.String(),
		ServiceID: serviceID,
		ProjectID: projectID,
		Title:     item.Title,
		Message:   item.Message,
		Channels:  item.Channels,
		Metadata:  metadata,
		Status:    item.Status,
		CreatedAt: item.CreatedAt.Time,
		UpdatedAt: item.UpdatedAt.Time,
	}
}

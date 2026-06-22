package notification

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/deveasyclick/iwifunni/internal/crypto"
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
	ID            string         `json:"id"`
	EnvironmentID *string        `json:"environment_id,omitempty"`
	Title         string         `json:"title"`
	Message       string         `json:"message"`
	Channels      []string       `json:"channels"`
	Metadata      map[string]any `json:"metadata"`
	Status        string         `json:"status"`
	IsTest        bool           `json:"is_test"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
}

type notificationStore interface {
	UpsertByProjectJob(ctx context.Context, arg db.UpsertNotificationByEnvironmentJobParams) (db.Notification, error)
	ListByProject(ctx context.Context, projectID uuid.UUID, includeTest bool) ([]db.Notification, error)
	GetByProject(ctx context.Context, id, projectID uuid.UUID) (db.Notification, error)
	GetByJobID(ctx context.Context, jobID string) (db.Notification, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status string, updatedAt pgtype.Timestamptz) error
	InsertDeliveryAttempt(ctx context.Context, arg db.InsertDeliveryAttemptParams) error
	GetActiveProvidersByChannel(ctx context.Context, projectID uuid.UUID, channel string) ([]db.Provider, error)
	GetWorkflowByID(ctx context.Context, id, projectID uuid.UUID) (db.Workflow, error)
	GetSubscriberByID(ctx context.Context, id, projectID uuid.UUID) (db.Subscriber, error)
	GetTemplateByID(ctx context.Context, id, projectID uuid.UUID) (db.Template, error)
}

// Service handles notification delivery logic.
type Service struct {
	repo          notificationStore
	registry      *registry.Registry
	dispatcher    *webhooks.Dispatcher
	encryptionKey string
}

func NewService(repo notificationStore, encryptionKey string) *Service {
	return &Service{repo: repo, registry: registry.NewDefault(), encryptionKey: encryptionKey}
}

func NewServiceWithWebhooks(repo notificationStore, dispatcher *webhooks.Dispatcher, encryptionKey string) *Service {
	return &Service{repo: repo, registry: registry.NewDefault(), dispatcher: dispatcher, encryptionKey: encryptionKey}
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

// SendSync delivers a notification synchronously and returns an error if
// any channel delivery fails. Unlike Send, it does not swallow delivery
// failures — useful for test sends where the caller needs to know the result.
func (s *Service) SendSync(ctx context.Context, job *types.NotificationJob) error {
	return s.send(ctx, job, true)
}

// Send delivers a notification asynchronously, recording delivery attempts
// in the database but swallowing per-channel errors. Returns nil after all
// deliveries are attempted regardless of individual failures.
func (s *Service) Send(ctx context.Context, job *types.NotificationJob) error {
	return s.send(ctx, job, false)
}

func (s *Service) send(ctx context.Context, job *types.NotificationJob, reportErrors bool) error {
	if job == nil {
		return invalidSend("notification payload is required")
	}
	job.JobID = strings.TrimSpace(job.JobID)
	if job.JobID == "" {
		return invalidSend("job_id is required")
	}

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
	if job.ProjectID == "" {
		return nil
	}

	projectID, err := uuid.Parse(job.ProjectID)
	if err != nil {
		return fmt.Errorf("invalid project_id: %w", err)
	}
	notificationRecord, err := s.repo.UpsertByProjectJob(ctx, db.UpsertNotificationByEnvironmentJobParams{
		ID:            uuid.New(),
		JobID:         &job.JobID,
		EnvironmentID: pgtype.UUID{Bytes: projectID, Valid: true},
		Title:         job.Title,
		Message:       job.Message,
		Channels:      job.Channels,
		Recipient:     recipient,
		Metadata:      metadata,
		Status:        "pending",
		IsTest:        job.IsTest,
		CreatedAt:     nowTs,
		UpdatedAt:     nowTs,
	})
	if err != nil {
		return err
	}
	notificationID := notificationRecord.ID
	if isTerminalNotificationStatus(notificationRecord.Status) {
		return nil
	}

	var deliveryErrors []string
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
			if reportErrors {
				deliveryErrors = append(deliveryErrors, fmt.Sprintf("%s: %s", channel, err.Error()))
			}
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
			EnvironmentID:  projectID.String(),
			Timestamp:      now().Format(time.RFC3339),
		})
	}
	if reportErrors && len(deliveryErrors) > 0 {
		return errors.New(strings.Join(deliveryErrors, "; "))
	}
	return nil

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

func isTerminalNotificationStatus(status string) bool {
	switch status {
	case "sent", "failed", "partial_failed", "partial_skipped", "skipped":
		return true
	default:
		return false
	}
}

func (s *Service) deliverProjectChannel(ctx context.Context, projectID, notificationID uuid.UUID, channel string, job *types.NotificationJob) error {
	log := logger.Get()

	providerRecords, err := s.repo.GetActiveProvidersByChannel(ctx, projectID, channel)
	if err != nil {
		log.Error().Err(err).Str("channel", channel).Str("project_id", projectID.String()).Msg("delivery: failed to query active providers")
		return s.recordFailed(ctx, notificationID, channel, "", fmt.Errorf("no active provider for channel %s: %w", channel, err))
	}
	if len(providerRecords) == 0 {
		log.Warn().Str("channel", channel).Str("project_id", projectID.String()).Msg("delivery: no active provider found — check provider configuration")
		return s.recordFailed(ctx, notificationID, channel, "", fmt.Errorf("no active provider for channel %s", channel))
	}

	log.Info().Str("channel", channel).Int("provider_count", len(providerRecords)).Msg("delivery: found active providers")

	var lastErr error
	for _, providerRecord := range providerRecords {
		p, ok := s.registry.Get(providerRecord.Name)
		if !ok || p.Channel() != channel {
			log.Warn().Str("provider", providerRecord.Name).Str("channel", channel).Msg("delivery: provider not registered for channel")
			lastErr = fmt.Errorf("provider %s not registered for channel %s", providerRecord.Name, channel)
			continue
		}
		providerConfig, cfgErr := s.buildProjectProviderConfig(providerRecord)
		if cfgErr != nil {
			log.Warn().Err(cfgErr).Str("provider", providerRecord.Name).Msg("delivery: failed to build provider config")
			lastErr = cfgErr
			continue
		}

		log.Info().Str("provider", providerRecord.Name).Str("channel", channel).Msg("delivery: attempting send via provider")
		attempts, providerErr := p.Send(ctx, job, providerConfig)
		for _, a := range attempts {
			if a.Err != nil {
				log.Warn().Err(a.Err).Str("provider", providerRecord.Name).Str("destination", a.Destination).Msg("delivery: attempt failed")
				_ = s.recordFailed(ctx, notificationID, channel, a.Destination, a.Err)
				continue
			}
			log.Info().Str("provider", providerRecord.Name).Str("destination", a.Destination).Msg("delivery: attempt succeeded")
			_ = s.recordSuccess(ctx, notificationID, channel, a.Destination)
		}
		if providerErr == nil {
			log.Info().Str("provider", providerRecord.Name).Str("channel", channel).Msg("delivery: all attempts succeeded")
			return nil
		}
		log.Warn().Err(providerErr).Str("provider", providerRecord.Name).Msg("delivery: provider returned error, trying next")
		lastErr = providerErr
	}
	if lastErr == nil {
		lastErr = fmt.Errorf("no active provider for channel %s", channel)
	}
	log.Error().Err(lastErr).Str("channel", channel).Str("project_id", projectID.String()).Msg("delivery: all providers failed")
	return s.recordFailed(ctx, notificationID, channel, "", lastErr)
}

func (s *Service) buildProjectProviderConfig(providerRecord db.Provider) ([]byte, error) {
	if len(providerRecord.Credentials) == 0 {
		return providerRecord.Config, nil
	}

	var encrypted string
	if err := json.Unmarshal(providerRecord.Credentials, &encrypted); err != nil {
		return nil, fmt.Errorf("invalid provider credentials payload: %w", err)
	}
	if strings.TrimSpace(encrypted) == "" {
		return providerRecord.Config, nil
	}
	if strings.TrimSpace(s.encryptionKey) == "" {
		return nil, fmt.Errorf("provider encryption key is not configured")
	}

	decrypted, err := crypto.Decrypt(encrypted, s.encryptionKey)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt provider credentials: %w", err)
	}

	merged := map[string]any{}
	if len(providerRecord.Config) > 0 {
		if err := json.Unmarshal(providerRecord.Config, &merged); err != nil {
			return nil, fmt.Errorf("invalid provider config: %w", err)
		}
	}

	var credentials map[string]any
	if err := json.Unmarshal(decrypted, &credentials); err != nil {
		return nil, fmt.Errorf("invalid decrypted provider credentials: %w", err)
	}
	for key, value := range credentials {
		merged[key] = value
	}

	configJSON, err := json.Marshal(merged)
	if err != nil {
		return nil, fmt.Errorf("failed to encode provider config: %w", err)
	}

	return configJSON, nil
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

var now = func() time.Time { return time.Now().UTC() }

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

func (s *Service) ListByProject(ctx context.Context, projectID uuid.UUID, includeTest bool) ([]NotificationView, error) {
	items, err := s.repo.ListByProject(ctx, projectID, includeTest)
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

	var environmentID *string
	if item.EnvironmentID.Valid {
		value := uuid.UUID(item.EnvironmentID.Bytes).String()
		environmentID = &value
	}

	return NotificationView{
		ID:            item.ID.String(),
		EnvironmentID: environmentID,
		Title:         item.Title,
		Message:       item.Message,
		Channels:      item.Channels,
		Metadata:      metadata,
		Status:        item.Status,
		IsTest:        item.IsTest,
		CreatedAt:     item.CreatedAt.Time,
		UpdatedAt:     item.UpdatedAt.Time,
	}
}

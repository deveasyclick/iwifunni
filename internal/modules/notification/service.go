package notification

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/deveasyclick/iwifunni/internal/db"
	"github.com/deveasyclick/iwifunni/internal/modules/webhooks"
	"github.com/deveasyclick/iwifunni/internal/registry"
	"github.com/deveasyclick/iwifunni/internal/types"
	"github.com/deveasyclick/iwifunni/pkg/logger"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

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

	// Workflow-based sends: title and message come from templates, skip direct validation
	if prepared.WorkflowID != "" && prepared.SubscriberID != "" {
		if prepared.ProjectID == "" {
			return nil, invalidSend("workflow-based sends require project-scoped authentication")
		}
		return s.prepareWorkflowJob(ctx, &prepared)
	}

	// Direct sends: require title, message, and channels
	if prepared.Title == "" || prepared.Message == "" {
		return nil, invalidSend("title and message are required")
	}

	prepared.Channels = normalizeChannels(prepared.Channels)
	if len(prepared.Channels) == 0 {
		return nil, invalidSend("at least one channel is required")
	}
	if err := validateRecipientForChannels(prepared.Recipient, prepared.Channels); err != nil {
		return nil, err
	}
	return &prepared, nil
}

func (s *Service) prepareWorkflowJob(ctx context.Context, prepared *types.NotificationJob) (*types.NotificationJob, error) {
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

	var subscriberRecord db.Subscriber

	if prepared.IsSystemUser {
		userRecord, err := s.repo.GetUserByID(ctx, subscriberID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, fmt.Errorf("user not found: %w", err)
			}
			return nil, err
		}

		userEmail := userRecord.Email
		userName := strings.TrimSpace(userRecord.FirstName + " " + userRecord.LastName)
		if userName == "" {
			userName = userEmail
		}

		subscriberRecord = db.Subscriber{
			ID:    subscriberID,
			Name:  userName,
			Email: &userEmail,
		}
	} else {
		subscriberRecord, err = s.repo.GetSubscriberByID(ctx, subscriberID, projectID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, fmt.Errorf("subscriber not found: %w", err)
			}
			return nil, err
		}
	}

	channels := workflowRecord.Channels
	templateIDs, tmplErr := parseWorkflowTemplateIDs(workflowRecord.TemplateIds)
	if tmplErr != nil {
		templateIDs = map[string]string{}
	}

	if len(channels) == 0 && len(workflowRecord.DefinitionJson) > 0 {
		type notificationNodeCfg struct {
			TemplateID string   `json:"template_id,omitempty"`
			Channels   []string `json:"channels"`
		}
		type defNode struct {
			Type   string          `json:"type"`
			Config json.RawMessage `json:"config,omitempty"`
		}
		type workflowDef struct {
			Nodes []defNode `json:"nodes"`
		}

		var def workflowDef
		if parseErr := json.Unmarshal(workflowRecord.DefinitionJson, &def); parseErr == nil {
			seen := make(map[string]bool)
			for _, node := range def.Nodes {
				if node.Type == "notification" && len(node.Config) > 0 {
					var cfg notificationNodeCfg
					if parseErr := json.Unmarshal(node.Config, &cfg); parseErr == nil {
						for _, ch := range cfg.Channels {
							if !seen[ch] {
								channels = append(channels, ch)
								seen[ch] = true
							}
							if cfg.TemplateID != "" {
								templateIDs[ch] = cfg.TemplateID
							}
						}
					}
				}
			}
		}
	}

	requestedChannels := prepared.Channels

	if len(templateIDs) > 0 {
		templateIDsJSON, _ := json.Marshal(templateIDs)
		workflowRecord.TemplateIds = templateIDsJSON
	}

	if requestedChannels != nil {
		requested := make(map[string]bool, len(requestedChannels))
		for _, ch := range requestedChannels {
			requested[ch] = true
		}
		filtered := make([]string, 0, len(requestedChannels))
		for _, ch := range channels {
			if requested[ch] {
				filtered = append(filtered, ch)
			}
		}
		channels = filtered
	}

	workflowRecord.Channels = channels
	prepared.Channels = channels
	prepared.Channels, prepared.ChannelContent, prepared.SkippedChannels, prepared.Recipient, err = s.prepareWorkflowDelivery(ctx, projectID, workflowRecord, subscriberRecord, *prepared)
	if err != nil {
		return nil, err
	}
	prepared.Metadata = enrichMetadata(prepared.Metadata, workflowRecord, subscriberRecord)

	return prepared, nil
}

// SendSync delivers a notification synchronously and returns the
// notification ID if successful. Unlike Send, it does not swallow
// delivery failures — useful for test sends where the caller needs
// to know the result.
func (s *Service) SendSync(ctx context.Context, job *types.NotificationJob) (uuid.UUID, error) {
	return s.send(ctx, job, true)
}

// Send delivers a notification asynchronously, recording delivery attempts
// in the database but swallowing per-channel errors.
func (s *Service) Send(ctx context.Context, job *types.NotificationJob) error {
	_, err := s.send(ctx, job, false)
	return err
}

func (s *Service) send(ctx context.Context, job *types.NotificationJob, reportErrors bool) (uuid.UUID, error) {
	if job == nil {
		return uuid.Nil, invalidSend("notification payload is required")
	}
	job.JobID = strings.TrimSpace(job.JobID)
	if job.JobID == "" {
		return uuid.Nil, invalidSend("job_id is required")
	}

	recipient, err := json.Marshal(job.Recipient)
	if err != nil {
		return uuid.Nil, err
	}
	metadata, err := json.Marshal(job.Metadata)
	if err != nil {
		return uuid.Nil, err
	}
	nowTs := pgtype.Timestamptz{Time: now(), Valid: true}

	if job.ProjectID == "" {
		return uuid.Nil, nil
	}

	projectID, err := uuid.Parse(job.ProjectID)
	if err != nil {
		return uuid.Nil, fmt.Errorf("invalid project_id: %w", err)
	}
	channels := job.Channels
	if channels == nil {
		channels = []string{}
	}

	notificationRecord, err := s.repo.UpsertByProjectJob(ctx, db.UpsertNotificationByEnvironmentJobParams{
		ID:            uuid.New(),
		JobID:         &job.JobID,
		EnvironmentID: pgtype.UUID{Bytes: projectID, Valid: true},
		Title:         job.Title,
		Message:       job.Message,
		Channels:      channels,
		Recipient:     recipient,
		Metadata:      metadata,
		Status:        "pending",
		IsTest:        job.IsTest,
		CreatedAt:     nowTs,
		UpdatedAt:     nowTs,
	})
	if err != nil {
		return uuid.Nil, err
	}
	notificationID := notificationRecord.ID
	if isTerminalNotificationStatus(notificationRecord.Status) {
		return notificationID, nil
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
		return notificationID, err
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
		return notificationID, errors.New(strings.Join(deliveryErrors, "; "))
	}
	return notificationID, nil
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

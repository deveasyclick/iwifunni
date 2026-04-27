package notification

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/deveasyclick/iwifunni/internal/db"
	"github.com/deveasyclick/iwifunni/internal/registry"
	"github.com/deveasyclick/iwifunni/internal/types"
	"github.com/deveasyclick/iwifunni/internal/webhooks"
	"github.com/deveasyclick/iwifunni/pkg/logger"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

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

func (s *Service) Send(ctx context.Context, job *types.NotificationJob) error {
	if len(job.Channels) == 0 {
		return fmt.Errorf("at least one channel is required")
	}

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

		successCount, failureCount := 0, 0
		for _, channel := range job.Channels {
			if err := s.deliverProjectChannel(ctx, projectID, notificationID, channel, job); err != nil {
				logger.Get().Warn().Err(err).Str("channel", channel).Msg("delivery attempt failed")
				failureCount++
			} else {
				successCount++
			}
		}

		status := "failed"
		if successCount > 0 && failureCount == 0 {
			status = "sent"
		} else if successCount > 0 {
			status = "partial_failed"
		}
		if err := s.repo.UpdateStatus(ctx, notificationID, status, pgtype.Timestamptz{Time: now(), Valid: true}); err != nil {
			return err
		}
		if s.dispatcher != nil {
			event := "notification.sent"
			if status == "failed" {
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

	status := "failed"
	if successCount > 0 && failureCount == 0 {
		status = "sent"
	} else if successCount > 0 {
		status = "partial_failed"
	}
	return s.repo.UpdateStatus(ctx, notificationID, status, pgtype.Timestamptz{Time: now(), Valid: true})
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

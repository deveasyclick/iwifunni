package notification

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/deveasyclick/iwifunni/internal/db/gen"
	"github.com/deveasyclick/iwifunni/internal/types"
	"github.com/deveasyclick/iwifunni/internal/utils/crypto"
	"github.com/deveasyclick/iwifunni/pkg/logger"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

var now = func() time.Time { return time.Now().UTC() }

func (s *Service) deliverProjectChannel(ctx context.Context, projectID, notificationID uuid.UUID, channel string, job *types.NotificationJob) error {
	log := logger.Get()

	providerRecords, err := s.integrations.ListByChannel(ctx, projectID, channel)
	if err != nil {
		log.Error("delivery: failed to query active providers", "error", err, "channel", channel, "project_id", projectID.String())
		return s.recordFailed(ctx, notificationID, channel, "", fmt.Errorf("no active provider for channel %s: %w", channel, err))
	}

	// Pick the first active + registered provider (primary comes first from the query).
	// Sending through multiple providers for the same channel would produce
	// duplicate delivery attempts.
	var providerRecord *db.Integration
	for i := range providerRecords {
		if !providerRecords[i].IsActive {
			continue
		}
		if _, ok := s.registry.Get(providerRecords[i].Name); ok {
			providerRecord = &providerRecords[i]
			break
		}
	}

	if providerRecord == nil {
		log.Warn("delivery: no active provider found", "channel", channel, "project_id", projectID.String())
		return s.recordFailed(ctx, notificationID, channel, "", fmt.Errorf("no active provider for channel %s", channel))
	}

	p, _ := s.registry.Get(providerRecord.Name)

	providerConfig, cfgErr := s.buildProjectProviderConfig(*providerRecord)
	if cfgErr != nil {
		return s.recordFailed(ctx, notificationID, channel, "", cfgErr)
	}

	attempts, providerErr := p.Send(ctx, job, providerConfig)
	for _, a := range attempts {
		if a.Err != nil {
			_ = s.recordFailed(ctx, notificationID, channel, a.Destination, a.Err)
			continue
		}
		_ = s.recordSuccess(ctx, notificationID, channel, a.Destination)
	}
	if providerErr != nil {
		return s.recordFailed(ctx, notificationID, channel, "", providerErr)
	}
	return nil
}

func (s *Service) buildProjectProviderConfig(providerRecord db.Integration) ([]byte, error) {
	if len(providerRecord.Credentials) == 0 {
		return providerRecord.Config, nil
	}

	// Credentials are stored as a JSON string literal: "<encrypted_value>".
	// If the value is a JSON object (e.g. {}), there are no credentials to merge.
	var encrypted string
	if err := json.Unmarshal(providerRecord.Credentials, &encrypted); err != nil {
		// Not a JSON string — could be an object like {}. Return config as-is.
		return providerRecord.Config, nil
	}
	if strings.TrimSpace(encrypted) == "" {
		return providerRecord.Config, nil
	}
	if strings.TrimSpace(s.encryptionKey) == "" {
		return nil, fmt.Errorf("integration encryption key is not configured")
	}

	decrypted, err := crypto.Decrypt(encrypted, s.encryptionKey)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt integration credentials: %w", err)
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
	return s.repo.InsertDeliveryAttempt(ctx, db.UpsertDeliveryAttemptParams{
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
	return s.repo.InsertDeliveryAttempt(ctx, db.UpsertDeliveryAttemptParams{
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
	_ = s.repo.InsertDeliveryAttempt(ctx, db.UpsertDeliveryAttemptParams{
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

func (s *Service) GetDeliveryAttempts(ctx context.Context, notificationID uuid.UUID) ([]db.DeliveryAttempt, error) {
	return s.repo.ListDeliveryAttemptsByNotificationID(ctx, notificationID)
}

func (s *Service) CreateQueuedNotification(ctx context.Context, job *types.NotificationJob, notificationID uuid.UUID) error {
	recipient, err := json.Marshal(job.Recipient)
	if err != nil {
		return err
	}
	metadata, err := json.Marshal(job.Metadata)
	if err != nil {
		return err
	}
	nowTs := pgtype.Timestamptz{Time: now(), Valid: true}

	projectID, err := uuid.Parse(job.ProjectID)
	if err != nil {
		return err
	}

	channels := job.Channels
	if channels == nil {
		channels = []string{}
	}

	_, err = s.repo.UpsertByProjectJob(ctx, db.UpsertNotificationByEnvironmentJobParams{
		ID:            notificationID,
		JobID:         &job.JobID,
		EnvironmentID: pgtype.UUID{Bytes: projectID, Valid: true},
		Title:         job.Title,
		Message:       job.Message,
		Channels:      channels,
		Recipient:     recipient,
		Metadata:      metadata,
		Status:        "queued",
		IsTest:        job.IsTest,
		CreatedAt:     nowTs,
		UpdatedAt:     nowTs,
	})
	return err
}

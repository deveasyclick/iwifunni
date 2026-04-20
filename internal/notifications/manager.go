package notifications

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/deveasyclick/iwifunni/internal/channels"
	"github.com/deveasyclick/iwifunni/internal/config"
	"github.com/deveasyclick/iwifunni/internal/db"
	"github.com/deveasyclick/iwifunni/internal/types"
	"github.com/deveasyclick/iwifunni/internal/ws"
	"github.com/deveasyclick/iwifunni/pkg/logger"
	"github.com/google/uuid"
)

type Manager struct {
	queries  *db.Queries
	wsServer *ws.Server
	cfg      *config.Config
}

func NewManager(queries db.Queries, wsServer *ws.Server, cfg *config.Config) *Manager {
	return &Manager{queries: &queries, wsServer: wsServer, cfg: cfg}
}

func (m *Manager) Send(ctx context.Context, job *types.NotificationJob) error {
	deliveryChannels := job.Channels
	if len(deliveryChannels) == 0 {
		deliveryChannels = []string{"push", "in_app"}
	}

	serviceId, err := uuid.Parse(job.ServiceID)
	if err != nil {
		return err
	}
	metadata, err := json.Marshal(job.Metadata)
	if err != nil {
		return err
	}
	if err := m.queries.InsertNotification(ctx, db.InsertNotificationParams{
		ServiceID:  serviceId,
		UserID:     job.UserID,
		Title:      job.Title,
		Message:    job.Message,
		Channels:   deliveryChannels,
		Metadata:   metadata,
		Status:     "pending",
		RetryCount: 0,
	}); err != nil {
		return err
	}

	if contains(deliveryChannels, "in_app") {
		_ = m.queries.UpsertInAppNotification(ctx, db.UpsertInAppNotificationParams{
			UserID:   job.UserID,
			Title:    job.Title,
			Message:  job.Message,
			Metadata: metadata,
		})
		m.wsServer.Broadcast(&ws.NotificationPayload{UserID: job.UserID, Title: job.Title, Message: job.Message, Meta: job.Metadata})
	}

	success := true
	if contains(deliveryChannels, "push") {
		if err := m.sendPush(ctx, job); err != nil {
			logger.Get().Warn().Err(err).Msg("push failed")
			success = false
		}
	}

	if !success {
		prefs, err := m.queries.GetUserPreferences(ctx, job.UserID)
		if err != nil {
			return err
		}
		if prefs.EmailOptIn {
			if err := channels.SendEmail(ctx, m.cfg.BrevoAPIKey, job.UserID, job.Title, job.Message, job.Metadata); err != nil {
				logger.Get().Warn().Err(err).Msg("email fallback failed")
			}
		}
		if prefs.SmsOptIn {
			if err := channels.SendSMS(ctx, m.cfg.TermiiAPIKey, m.cfg.TermiiSenderID, job.UserID, job.Title, job.Message, job.Metadata); err != nil {
				logger.Get().Warn().Err(err).Msg("sms fallback failed")
			}
		}
	}

	return nil
}

func (m *Manager) sendPush(ctx context.Context, job *types.NotificationJob) error {
	subs, err := m.queries.GetPushSubscriptions(ctx, job.UserID)
	if err != nil {
		return err
	}
	if len(subs) == 0 {
		return fmt.Errorf("no subscriptions")
	}
	for _, sub := range subs {
		switch sub.Channel {
		case "fcm":
			if err := channels.SendFCM(ctx, m.cfg.FCMServerKey, sub.Endpoint, job.Title, job.Message, job.Metadata); err != nil {
				return err
			}
		case "webpush":
			if err := channels.SendBrowserPush(ctx, m.cfg.WebPushKey, m.cfg.WebPushSecret, sub.Endpoint, job.Title, job.Message, job.Metadata); err != nil {
				return err
			}
		default:
			continue
		}
	}
	return nil
}

func contains(items []string, value string) bool {
	for _, item := range items {
		if item == value {
			return true
		}
	}
	return false
}

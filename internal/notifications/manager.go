package notifications

import (
	"context"
	"fmt"

	"github.com/deveasyclick/iwifunni/internal/channels"
	"github.com/deveasyclick/iwifunni/internal/config"
	"github.com/deveasyclick/iwifunni/internal/storage"
	"github.com/deveasyclick/iwifunni/internal/types"
	"github.com/deveasyclick/iwifunni/internal/ws"
	"github.com/rs/zerolog/log"
)

type Manager struct {
    store    *storage.Store
    wsServer *ws.Server
    cfg      *config.Config
}

func NewManager(store *storage.Store, wsServer *ws.Server, cfg *config.Config) *Manager {
    return &Manager{store: store, wsServer: wsServer, cfg: cfg}
}

func (m *Manager) Send(ctx context.Context, job *types.NotificationJob) error {
    deliveryChannels := job.Channels
    if len(deliveryChannels) == 0 {
        deliveryChannels = []string{"push", "in_app"}
    }

    if err := m.store.InsertNotification(ctx, &storage.NotificationRecord{
        ServiceID: job.ServiceID,
        UserID:    job.UserID,
        Title:     job.Title,
        Message:   job.Message,
        Channels:  deliveryChannels,
        Metadata:  job.Metadata,
        Status:     "pending",
        RetryCount: 0,
    }); err != nil {
        return err
    }

    if contains(deliveryChannels, "in_app") {
        _ = m.store.UpsertInAppNotification(ctx, job.UserID, job.Title, job.Message, job.Metadata)
        m.wsServer.Broadcast(&ws.NotificationPayload{UserID: job.UserID, Title: job.Title, Message: job.Message, Meta: job.Metadata})
    }

    success := true
    if contains(deliveryChannels, "push") {
        if err := m.sendPush(ctx, job); err != nil {
            log.Warn().Err(err).Msg("push failed")
            success = false
        }
    }

    if !success {
        prefs, err := m.store.GetUserPreferences(ctx, job.UserID)
        if err != nil {
            return err
        }
        if prefs.EmailOpt {
            if err := channels.SendEmail(ctx, m.cfg.BrevoAPIKey, job.UserID, job.Title, job.Message, job.Metadata); err != nil {
                log.Warn().Err(err).Msg("email fallback failed")
            }
        }
        if prefs.SMSOpt {
            if err := channels.SendSMS(ctx, m.cfg.TermiiAPIKey, m.cfg.TermiiSenderID, job.UserID, job.Title, job.Message, job.Metadata); err != nil {
                log.Warn().Err(err).Msg("sms fallback failed")
            }
        }
    }

    return nil
}

func (m *Manager) sendPush(ctx context.Context, job *types.NotificationJob) error {
    subs, err := m.store.GetPushSubscriptions(ctx, job.UserID)
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

func contains(items []string, needle string) bool {
    for _, item := range items {
        if item == needle {
            return true
        }
    }
    return false
}

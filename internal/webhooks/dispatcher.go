package webhooks

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/deveasyclick/iwifunni/internal/db"
	"github.com/deveasyclick/iwifunni/internal/types"
	"github.com/deveasyclick/iwifunni/pkg/logger"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

var ErrInvalidWebhookJob = errors.New("invalid webhook delivery job")

type webhookStore interface {
	ListActiveWebhooksForEvent(context.Context, db.ListActiveWebhooksForEventParams) ([]db.Webhook, error)
	GetWebhookByID(context.Context, db.GetWebhookByIDParams) (db.Webhook, error)
	InsertWebhookDelivery(context.Context, db.InsertWebhookDeliveryParams) error
}

type webhookEnqueuer interface {
	EnqueueWebhook(context.Context, *types.WebhookDeliveryJob) error
}

type Dispatcher struct {
	queries  webhookStore
	client   *http.Client
	enqueuer webhookEnqueuer
}

func NewDispatcher(queries webhookStore, enqueuer webhookEnqueuer) *Dispatcher {
	return &Dispatcher{
		queries:  queries,
		enqueuer: enqueuer,
		client:   &http.Client{Timeout: 10 * time.Second},
	}
}

type EventPayload struct {
	Event          string `json:"event"`
	NotificationID string `json:"notification_id,omitempty"`
	EnvironmentID  string `json:"environment_id"`
	Reason         string `json:"reason,omitempty"`
	Timestamp      string `json:"timestamp"`
}

func (d *Dispatcher) Dispatch(ctx context.Context, environmentID uuid.UUID, event string, payload EventPayload) {
	if d.enqueuer == nil {
		logger.Get().Warn().Str("event", event).Msg("webhook dispatcher has no queue producer")
		return
	}

	webhooks, err := d.queries.ListActiveWebhooksForEvent(ctx, db.ListActiveWebhooksForEventParams{
		EnvironmentID: environmentID,
		Events:        []string{event},
	})
	if err != nil {
		logger.Get().Warn().Err(err).Str("event", event).Msg("failed to list webhooks for event")
		return
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		logger.Get().Warn().Err(err).Msg("failed to marshal webhook payload")
		return
	}

	for _, wh := range webhooks {
		if err := d.enqueuer.EnqueueWebhook(ctx, &types.WebhookDeliveryJob{
			WebhookID: wh.ID.String(),
			ProjectID: environmentID.String(),
			Event:     event,
			Payload:   payloadBytes,
		}); err != nil {
			logger.Get().Warn().Err(err).Str("event", event).Str("webhook_id", wh.ID.String()).Msg("failed to enqueue webhook delivery")
		}
	}
}

func (d *Dispatcher) Execute(ctx context.Context, job *types.WebhookDeliveryJob) error {
	if job == nil {
		return invalidWebhookJob("webhook delivery payload is required")
	}

	job.Event = strings.TrimSpace(job.Event)
	job.ProjectID = strings.TrimSpace(job.ProjectID)
	job.WebhookID = strings.TrimSpace(job.WebhookID)
	if job.Event == "" || job.ProjectID == "" || job.WebhookID == "" || len(job.Payload) == 0 {
		return invalidWebhookJob("webhook_id, project_id, event, and payload are required")
	}

	environmentID, err := uuid.Parse(job.ProjectID)
	if err != nil {
		return invalidWebhookJob("invalid project_id")
	}
	webhookID, err := uuid.Parse(job.WebhookID)
	if err != nil {
		return invalidWebhookJob("invalid webhook_id")
	}

	wh, err := d.queries.GetWebhookByID(ctx, db.GetWebhookByIDParams{
		ID:            webhookID,
		EnvironmentID: environmentID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return invalidWebhookJob("webhook not found")
		}
		return err
	}
	if !wh.IsActive {
		d.recordDelivery(ctx, wh.ID, job.Event, job.Payload, "failed", nil, "webhook is inactive")
		return invalidWebhookJob("webhook is inactive")
	}
	if !containsEvent(wh.Events, job.Event) {
		d.recordDelivery(ctx, wh.ID, job.Event, job.Payload, "failed", nil, "webhook is not subscribed to event")
		return invalidWebhookJob("webhook is not subscribed to event")
	}

	return d.deliver(ctx, wh, job.Event, job.Payload)
}

func (d *Dispatcher) deliver(ctx context.Context, wh db.Webhook, event string, payloadBytes []byte) error {
	sig := sign(payloadBytes, wh.Secret)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, wh.Url, bytes.NewReader(payloadBytes))
	if err != nil {
		d.recordDelivery(ctx, wh.ID, event, payloadBytes, "failed", nil, fmt.Sprintf("create request: %s", err))
		return invalidWebhookJob("failed to create request")
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Signature-256", "sha256="+sig)

	resp, err := d.client.Do(req)
	if err != nil {
		d.recordDelivery(ctx, wh.ID, event, payloadBytes, "failed", nil, fmt.Sprintf("http error: %s", err))
		return fmt.Errorf("webhook request failed: %w", err)
	}
	defer resp.Body.Close()

	code := int32(resp.StatusCode)
	status := "sent"
	errMsg := ""
	if code < 200 || code >= 300 {
		status = "failed"
		errMsg = fmt.Sprintf("unexpected status code: %d", code)
	}
	d.recordDelivery(ctx, wh.ID, event, payloadBytes, status, &code, errMsg)
	if status == "sent" {
		return nil
	}
	if code >= 400 && code < 500 {
		return invalidWebhookJob(errMsg)
	}
	return fmt.Errorf("%s", errMsg)
}

func (d *Dispatcher) recordDelivery(ctx context.Context, webhookID uuid.UUID, event string, payload []byte, status string, responseCode *int32, errMsg string) {
	var errMsgPtr *string
	if errMsg != "" {
		errMsgPtr = &errMsg
	}
	if err := d.queries.InsertWebhookDelivery(ctx, db.InsertWebhookDeliveryParams{
		ID:           uuid.New(),
		WebhookID:    webhookID,
		Event:        event,
		Payload:      payload,
		Status:       status,
		ResponseCode: responseCode,
		ErrorMessage: errMsgPtr,
		AttemptedAt:  pgtype.Timestamptz{Time: time.Now().UTC(), Valid: true},
	}); err != nil {
		logger.Get().Warn().Err(err).Msg("failed to record webhook delivery")
	}
}

func containsEvent(events []string, event string) bool {
	for _, candidate := range events {
		if strings.TrimSpace(candidate) == event {
			return true
		}
	}
	return false
}

func invalidWebhookJob(message string) error {
	return fmt.Errorf("%w: %s", ErrInvalidWebhookJob, message)
}

func sign(payload []byte, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	return hex.EncodeToString(mac.Sum(nil))
}

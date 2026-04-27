package webhooks

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/deveasyclick/iwifunni/internal/db"
	"github.com/deveasyclick/iwifunni/pkg/logger"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

type Dispatcher struct {
	queries *db.Queries
	client  *http.Client
}

func NewDispatcher(queries *db.Queries) *Dispatcher {
	return &Dispatcher{
		queries: queries,
		client:  &http.Client{Timeout: 10 * time.Second},
	}
}

type EventPayload struct {
	Event          string `json:"event"`
	NotificationID string `json:"notification_id,omitempty"`
	ProjectID      string `json:"project_id"`
	Reason         string `json:"reason,omitempty"`
	Timestamp      string `json:"timestamp"`
}

func (d *Dispatcher) Dispatch(ctx context.Context, projectID uuid.UUID, event string, payload EventPayload) {
	webhooks, err := d.queries.ListActiveWebhooksForEvent(ctx, db.ListActiveWebhooksForEventParams{
		ProjectID: projectID,
		Events:    []string{event},
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
		go d.deliver(ctx, wh, event, payloadBytes)
	}
}

func (d *Dispatcher) deliver(ctx context.Context, wh db.Webhook, event string, payloadBytes []byte) {
	sig := sign(payloadBytes, wh.Secret)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, wh.Url, bytes.NewReader(payloadBytes))
	if err != nil {
		d.recordDelivery(ctx, wh.ID, event, payloadBytes, "failed", nil, fmt.Sprintf("create request: %s", err))
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Signature-256", "sha256="+sig)

	resp, err := d.client.Do(req)
	if err != nil {
		d.recordDelivery(ctx, wh.ID, event, payloadBytes, "failed", nil, fmt.Sprintf("http error: %s", err))
		return
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

func sign(payload []byte, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	return hex.EncodeToString(mac.Sum(nil))
}

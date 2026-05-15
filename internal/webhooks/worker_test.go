package webhooks

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"testing"

	"github.com/deveasyclick/iwifunni/internal/db"
	"github.com/deveasyclick/iwifunni/internal/queue"
	"github.com/deveasyclick/iwifunni/internal/types"
	"github.com/google/uuid"
	"github.com/hibiken/asynq"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

type fakeWebhookStore struct {
	webhook        db.Webhook
	getWebhookErr  error
	deliveryWrites []db.InsertWebhookDeliveryParams
}

func (f *fakeWebhookStore) ListActiveWebhooksForEvent(context.Context, db.ListActiveWebhooksForEventParams) ([]db.Webhook, error) {
	return nil, nil
}

func (f *fakeWebhookStore) GetWebhookByID(context.Context, db.GetWebhookByIDParams) (db.Webhook, error) {
	if f.getWebhookErr != nil {
		return db.Webhook{}, f.getWebhookErr
	}
	return f.webhook, nil
}

func (f *fakeWebhookStore) InsertWebhookDelivery(_ context.Context, arg db.InsertWebhookDeliveryParams) error {
	f.deliveryWrites = append(f.deliveryWrites, arg)
	return nil
}

type roundTripFunc func(*http.Request) (*http.Response, error)

func (fn roundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return fn(req)
}

func TestWorkerHandleSkipsRetryForInvalidPayload(t *testing.T) {
	t.Parallel()

	worker := &Worker{dispatcher: NewDispatcher(&fakeWebhookStore{}, nil)}
	task := asynq.NewTask(queue.TaskTypeWebhookDeliver, []byte("not-json"))

	err := worker.handle(context.Background(), task)
	if !errors.Is(err, asynq.SkipRetry) {
		t.Fatalf("handle() error = %v, want SkipRetry", err)
	}
}

func TestWorkerHandleSkipsRetryForInvalidWebhookJob(t *testing.T) {
	t.Parallel()

	worker := &Worker{dispatcher: NewDispatcher(&fakeWebhookStore{}, nil)}
	task := asynq.NewTask(queue.TaskTypeWebhookDeliver, mustMarshalWebhookJob(t, types.WebhookDeliveryJob{}))

	err := worker.handle(context.Background(), task)
	if !errors.Is(err, asynq.SkipRetry) {
		t.Fatalf("handle() error = %v, want SkipRetry", err)
	}
	if !errors.Is(err, ErrInvalidWebhookJob) {
		t.Fatalf("handle() error = %v, want ErrInvalidWebhookJob", err)
	}
}

func TestWorkerHandleRecordsTransportFailure(t *testing.T) {
	t.Parallel()

	store := newFakeWebhookStore()
	dispatcher := NewDispatcher(store, nil)
	dispatcher.client = &http.Client{Transport: roundTripFunc(func(*http.Request) (*http.Response, error) {
		return nil, fmt.Errorf("dial tcp: connection refused")
	})}
	worker := &Worker{dispatcher: dispatcher}
	task := asynq.NewTask(queue.TaskTypeWebhookDeliver, mustMarshalWebhookJob(t, validWebhookJob(store.webhook)))

	err := worker.handle(context.Background(), task)
	if err == nil {
		t.Fatal("handle() error = nil, want retryable error")
	}
	if errors.Is(err, asynq.SkipRetry) {
		t.Fatalf("handle() error = %v, did not want SkipRetry", err)
	}
	if len(store.deliveryWrites) != 1 {
		t.Fatalf("delivery writes = %d, want 1", len(store.deliveryWrites))
	}
	if store.deliveryWrites[0].Status != "failed" {
		t.Fatalf("delivery status = %q, want failed", store.deliveryWrites[0].Status)
	}
	if store.deliveryWrites[0].ErrorMessage == nil || !strings.Contains(*store.deliveryWrites[0].ErrorMessage, "http error") {
		t.Fatalf("error message = %v, want transport failure", store.deliveryWrites[0].ErrorMessage)
	}
}

func TestWorkerHandleSkipsRetryForClientErrorResponse(t *testing.T) {
	t.Parallel()

	store := newFakeWebhookStore()
	dispatcher := NewDispatcher(store, nil)
	dispatcher.client = &http.Client{Transport: roundTripFunc(func(*http.Request) (*http.Response, error) {
		return &http.Response{
			StatusCode: http.StatusBadRequest,
			Body:       io.NopCloser(strings.NewReader("bad request")),
		}, nil
	})}
	worker := &Worker{dispatcher: dispatcher}
	task := asynq.NewTask(queue.TaskTypeWebhookDeliver, mustMarshalWebhookJob(t, validWebhookJob(store.webhook)))

	err := worker.handle(context.Background(), task)
	if !errors.Is(err, asynq.SkipRetry) {
		t.Fatalf("handle() error = %v, want SkipRetry", err)
	}
	if len(store.deliveryWrites) != 1 {
		t.Fatalf("delivery writes = %d, want 1", len(store.deliveryWrites))
	}
	if store.deliveryWrites[0].ResponseCode == nil || *store.deliveryWrites[0].ResponseCode != http.StatusBadRequest {
		t.Fatalf("response code = %v, want %d", store.deliveryWrites[0].ResponseCode, http.StatusBadRequest)
	}
}

func TestWorkerHandleRecordsSuccess(t *testing.T) {
	t.Parallel()

	store := newFakeWebhookStore()
	dispatcher := NewDispatcher(store, nil)
	dispatcher.client = &http.Client{Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
		if got := req.Header.Get("X-Signature-256"); !strings.HasPrefix(got, "sha256=") {
			t.Fatalf("signature header = %q, want sha256= prefix", got)
		}
		return &http.Response{
			StatusCode: http.StatusNoContent,
			Body:       io.NopCloser(strings.NewReader("")),
		}, nil
	})}
	worker := &Worker{dispatcher: dispatcher}
	task := asynq.NewTask(queue.TaskTypeWebhookDeliver, mustMarshalWebhookJob(t, validWebhookJob(store.webhook)))

	err := worker.handle(context.Background(), task)
	if err != nil {
		t.Fatalf("handle() error = %v, want nil", err)
	}
	if len(store.deliveryWrites) != 1 {
		t.Fatalf("delivery writes = %d, want 1", len(store.deliveryWrites))
	}
	if store.deliveryWrites[0].Status != "sent" {
		t.Fatalf("delivery status = %q, want sent", store.deliveryWrites[0].Status)
	}
}

func newFakeWebhookStore() *fakeWebhookStore {
	projectID := uuid.New()
	return &fakeWebhookStore{
		webhook: db.Webhook{
			ID:        uuid.New(),
			ProjectID: projectID,
			Url:       "https://example.com/hooks/notify",
			Secret:    "top-secret",
			Events:    []string{"notification.sent"},
			IsActive:  true,
			CreatedAt: pgtype.Timestamptz{Valid: true},
			UpdatedAt: pgtype.Timestamptz{Valid: true},
		},
	}
}

func validWebhookJob(wh db.Webhook) types.WebhookDeliveryJob {
	return types.WebhookDeliveryJob{
		JobID:     uuid.NewString(),
		WebhookID: wh.ID.String(),
		ProjectID: wh.ProjectID.String(),
		Event:     "notification.sent",
		Payload:   []byte(`{"event":"notification.sent"}`),
	}
}

func mustMarshalWebhookJob(t *testing.T, job types.WebhookDeliveryJob) []byte {
	t.Helper()
	payload, err := json.Marshal(job)
	if err != nil {
		t.Fatalf("json.Marshal() error = %v", err)
	}
	return payload
}

var _ = pgx.ErrNoRows
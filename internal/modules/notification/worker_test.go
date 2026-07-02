package notification

import (
	"context"
	"encoding/json"
	"errors"
	"testing"

	"github.com/deveasyclick/iwifunni/internal/types"
	"github.com/hibiken/asynq"
)

func TestWorkerHandleSkipsRetryForInvalidPayload(t *testing.T) {
	t.Parallel()

	store := newFakeNotificationStore()
	worker := &Worker{service: NewService(Stores{
		Notifications: store,
		Workflows:     store,
		Subscribers:   store,
		Templates:     store,
		Integrations:  store,
		Users:         store,
	}, "0123456789abcdef0123456789abcdef")}
	task := asynq.NewTask(TaskTypeNotificationSend, []byte("not-json"))

	err := worker.handle(context.Background(), task)
	if !errors.Is(err, asynq.SkipRetry) {
		t.Fatalf("handle() error = %v, want SkipRetry", err)
	}
}

func TestWorkerHandleSkipsRetryForInvalidSendRequest(t *testing.T) {
	t.Parallel()

	store := newFakeNotificationStore()
	service := NewService(Stores{
		Notifications: store,
		Workflows:     store,
		Subscribers:   store,
		Templates:     store,
		Integrations:  store,
		Users:         store,
	}, "0123456789abcdef0123456789abcdef")
	worker := &Worker{service: service}
	task := asynq.NewTask(TaskTypeNotificationSend, mustMarshalNotificationJob(t, types.NotificationJob{}))

	err := worker.handle(context.Background(), task)
	if !errors.Is(err, asynq.SkipRetry) {
		t.Fatalf("handle() error = %v, want SkipRetry", err)
	}
	if !errors.Is(err, ErrInvalidSendRequest) {
		t.Fatalf("handle() error = %v, want ErrInvalidSendRequest", err)
	}
}

func mustMarshalNotificationJob(t *testing.T, job types.NotificationJob) []byte {
	t.Helper()
	payload, err := json.Marshal(job)
	if err != nil {
		t.Fatalf("json.Marshal() error = %v", err)
	}
	return payload
}

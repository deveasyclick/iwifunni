package webhooks

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/deveasyclick/iwifunni/internal/queue"
	"github.com/deveasyclick/iwifunni/internal/types"
	"github.com/deveasyclick/iwifunni/pkg/logger"
	"github.com/hibiken/asynq"
)

type Worker struct {
	dispatcher *Dispatcher
}

func NewWorker(dispatcher *Dispatcher) *Worker {
	return &Worker{dispatcher: dispatcher}
}

func (w *Worker) Register(mux *asynq.ServeMux) {
	mux.HandleFunc(queue.TaskTypeWebhookDeliver, w.handle)
}

func (w *Worker) handle(ctx context.Context, t *asynq.Task) error {
	var job types.WebhookDeliveryJob
	if err := json.Unmarshal(t.Payload(), &job); err != nil {
		logger.Get().Error().Err(err).Msg("invalid webhook job payload")
		return errors.Join(asynq.SkipRetry, fmt.Errorf("invalid webhook job payload: %w", err))
	}

	err := w.dispatcher.Execute(ctx, &job)
	if err != nil && errors.Is(err, ErrInvalidWebhookJob) {
		logger.Get().Warn().Err(err).Str("job_id", job.JobID).Msg("webhook job is invalid and will not be retried")
		return errors.Join(asynq.SkipRetry, err)
	}
	return err
}
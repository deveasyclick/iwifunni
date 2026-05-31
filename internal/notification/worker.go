package notification

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/deveasyclick/iwifunni/internal/types"
	"github.com/deveasyclick/iwifunni/pkg/logger"
	"github.com/hibiken/asynq"
)

const TaskTypeNotificationSend = "notification:send"

// Worker consumes notification jobs from the Asynq queue.
type Worker struct {
	server  *asynq.Server
	service *Service
}

func NewWorker(server *asynq.Server, service *Service) *Worker {
	return &Worker{server: server, service: service}
}

func (w *Worker) Register(mux *asynq.ServeMux) {
	mux.HandleFunc(TaskTypeNotificationSend, w.handle)
}

func (w *Worker) Run(ctx context.Context) error {
	mux := asynq.NewServeMux()
	w.Register(mux)
	return w.server.Start(mux)
}

func (w *Worker) handle(ctx context.Context, t *asynq.Task) error {
	var job types.NotificationJob
	if err := json.Unmarshal(t.Payload(), &job); err != nil {
		logger.Get().Error().Err(err).Msg("invalid notification job payload")
		return errors.Join(asynq.SkipRetry, fmt.Errorf("invalid notification job payload: %w", err))
	}
	err := w.service.Send(ctx, &job)
	if err != nil && errors.Is(err, ErrInvalidSendRequest) {
		logger.Get().Warn().Err(err).Str("job_id", job.JobID).Msg("notification job is invalid and will not be retried")
		return errors.Join(asynq.SkipRetry, err)
	}
	return err
}

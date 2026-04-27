package notification

import (
	"context"
	"encoding/json"

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

func (w *Worker) Run(ctx context.Context) error {
	mux := asynq.NewServeMux()
	mux.HandleFunc(TaskTypeNotificationSend, w.handle)
	return w.server.Start(mux)
}

func (w *Worker) handle(ctx context.Context, t *asynq.Task) error {
	var job types.NotificationJob
	if err := json.Unmarshal(t.Payload(), &job); err != nil {
		logger.Get().Error().Err(err).Msg("invalid notification job payload")
		return err
	}
	return w.service.Send(ctx, &job)
}

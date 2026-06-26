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
	log := logger.Get()
	var job types.NotificationJob
	if err := json.Unmarshal(t.Payload(), &job); err != nil {
		log.Error("invalid notification job payload", "error", err)
		return errors.Join(asynq.SkipRetry, fmt.Errorf("invalid notification job payload: %w", err))
	}

	log.Info("worker: processing notification job",
		"job_id", job.JobID,
		"channel", fmt.Sprintf("%v", job.Channels),
		"recipient_email", job.Recipient.Email,
		"project_id", job.ProjectID,
	)

	err := w.service.Send(ctx, &job)
	if err != nil {
		if errors.Is(err, ErrInvalidSendRequest) {
			log.Warn("worker: notification job is invalid and will not be retried", "error", err, "job_id", job.JobID)
			return errors.Join(asynq.SkipRetry, err)
		}
		log.Error("worker: notification delivery failed, will retry", "error", err, "job_id", job.JobID)
		return err
	}

	log.Info("worker: notification delivered successfully", "job_id", job.JobID)
	return nil
}

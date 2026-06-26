package workflow

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
	server  *asynq.Server
	service *Service
}

func NewWorker(server *asynq.Server, service *Service) *Worker {
	return &Worker{server: server, service: service}
}

func (w *Worker) Register(mux *asynq.ServeMux) {
	mux.HandleFunc(queue.TaskTypeWorkflowStep, w.handle)
}

func (w *Worker) Run(ctx context.Context) error {
	mux := asynq.NewServeMux()
	w.Register(mux)
	return w.server.Start(mux)
}

func (w *Worker) handle(ctx context.Context, t *asynq.Task) error {
	var job types.WorkflowStepJob
	if err := json.Unmarshal(t.Payload(), &job); err != nil {
		logger.Get().Error("invalid workflow step job payload", "error", err)
		return errors.Join(asynq.SkipRetry, fmt.Errorf("invalid workflow step job payload: %w", err))
	}
	if err := w.service.ProcessStep(ctx, job); err != nil {
		if errors.Is(err, ErrInvalidWorkflow) || errors.Is(err, ErrInvalidWorkflowEvent) {
			logger.Get().Warn("workflow step job is invalid and will not be retried", "error", err, "execution_id", job.ExecutionID, "step_id", job.StepID)
			return errors.Join(asynq.SkipRetry, err)
		}
		return err
	}
	return nil
}
package queue

import (
	"context"
	"encoding/json"

	"github.com/deveasyclick/iwifunni/internal/types"
	"github.com/google/uuid"
	"github.com/hibiken/asynq"
)

const TaskTypeNotificationSend = "notification:send"

// Producer enqueues notification jobs to asynq.
type Producer struct {
	client *asynq.Client
}

func NewProducer(client *asynq.Client) *Producer {
	return &Producer{client: client}
}

func (p *Producer) Enqueue(ctx context.Context, job *types.NotificationJob) error {
	if job.JobID == "" {
		job.JobID = uuid.NewString()
	}
	payload, err := json.Marshal(job)
	if err != nil {
		return err
	}
	task := asynq.NewTask(TaskTypeNotificationSend, payload)
	_, err = p.client.EnqueueContext(ctx, task)
	return err
}

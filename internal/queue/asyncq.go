package queue

import (
	"context"
	"encoding/json"
	"time"

	"github.com/deveasyclick/iwifunni/internal/types"
	"github.com/google/uuid"
	"github.com/hibiken/asynq"
)

const TaskTypeNotificationSend = "notification:send"
const TaskTypeWebhookDeliver = "webhook:deliver"

const NotificationQueueName = "default"

var (
	defaultNotificationTaskTimeout = 2 * time.Minute
	defaultNotificationUniqueTTL   = 5 * time.Minute
)

// Producer enqueues notification jobs to asynq.
type Producer struct {
	client      *asynq.Client
	maxRetry    int
	taskTimeout time.Duration
	uniqueTTL   time.Duration
}

func NewProducer(client *asynq.Client) *Producer {
	return &Producer{
		client:      client,
		maxRetry:    5,
		taskTimeout: defaultNotificationTaskTimeout,
		uniqueTTL:   defaultNotificationUniqueTTL,
	}
}

func (p *Producer) WithTaskOptions(maxRetry int, taskTimeout, uniqueTTL time.Duration) *Producer {
	if maxRetry > 0 {
		p.maxRetry = maxRetry
	}
	if taskTimeout > 0 {
		p.taskTimeout = taskTimeout
	}
	if uniqueTTL > 0 {
		p.uniqueTTL = uniqueTTL
	}
	return p
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
	_, err = p.client.EnqueueContext(ctx, task,
		asynq.Queue(NotificationQueueName),
		asynq.MaxRetry(p.maxRetry),
		asynq.Timeout(p.taskTimeout),
		asynq.Unique(p.uniqueTTL),
	)
	return err
}

func (p *Producer) EnqueueWebhook(ctx context.Context, job *types.WebhookDeliveryJob) error {
	if job.JobID == "" {
		job.JobID = uuid.NewString()
	}
	payload, err := json.Marshal(job)
	if err != nil {
		return err
	}
	task := asynq.NewTask(TaskTypeWebhookDeliver, payload)
	_, err = p.client.EnqueueContext(ctx, task,
		asynq.Queue(NotificationQueueName),
		asynq.MaxRetry(p.maxRetry),
		asynq.Timeout(p.taskTimeout),
		asynq.Unique(p.uniqueTTL),
	)
	return err
}

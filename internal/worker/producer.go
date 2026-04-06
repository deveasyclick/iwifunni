package worker

import (
	"context"
	"encoding/json"

	"github.com/deveasyclick/iwifunni/internal/types"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

type Producer struct {
    client *redis.Client
    queue  string
}

func NewProducer(client *redis.Client) *Producer {
    return &Producer{client: client, queue: "notifications:queue"}
}

func (p *Producer) Enqueue(ctx context.Context, job *types.NotificationJob) error {
    if job.JobID == "" {
        job.JobID = uuid.NewString()
    }
    payload, err := json.Marshal(job)
    if err != nil {
        return err
    }
    return p.client.RPush(ctx, p.queue, payload).Err()
}

package worker

import (
	"context"
	"encoding/json"
	"time"

	"github.com/deveasyclick/iwifunni/internal/notifications"
	"github.com/deveasyclick/iwifunni/internal/types"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog/log"
)

type Consumer struct {
    client    *redis.Client
    queue     string
    notifier  *notifications.Manager
}

func NewConsumer(client *redis.Client, notifier *notifications.Manager) *Consumer {
    return &Consumer{client: client, queue: "notifications:queue", notifier: notifier}
}

func (c *Consumer) Run(ctx context.Context) error {
    for {
        select {
        case <-ctx.Done():
            return nil
        default:
        }

        result, err := c.client.BLPop(ctx, 5*time.Second, c.queue).Result()
        if err != nil {
            if err == redis.Nil {
                continue
            }
            log.Error().Err(err).Msg("failed to dequeue notification")
            time.Sleep(time.Second)
            continue
        }

        if len(result) < 2 {
            continue
        }

        var job types.NotificationJob
        if err := json.Unmarshal([]byte(result[1]), &job); err != nil {
            log.Error().Err(err).Msg("invalid job payload")
            continue
        }

        if err := c.process(ctx, &job); err != nil {
            log.Error().Err(err).Msg("notification processing failed")
        }
    }
}

func (c *Consumer) process(ctx context.Context, job *types.NotificationJob) error {
    return c.notifier.Send(ctx, job)
}

package auth

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

type RateLimiter struct {
    client *redis.Client
    limit  int
}

func NewRateLimiter(client *redis.Client, limit int) *RateLimiter {
    return &RateLimiter{client: client, limit: limit}
}

func (r *RateLimiter) Allow(ctx context.Context, serviceID string) (bool, error) {
    key := fmt.Sprintf("rate_limit:%s", serviceID)
    count, err := r.client.Incr(ctx, key).Result()
    if err != nil {
        return false, err
    }
    if count == 1 {
        if err := r.client.Expire(ctx, key, time.Minute).Err(); err != nil {
            return false, err
        }
    }
    return count <= int64(r.limit), nil
}


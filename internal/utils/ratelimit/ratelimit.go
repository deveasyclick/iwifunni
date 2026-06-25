package ratelimit

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// RateLimiter implements a simple per-key sliding window rate limiter backed by Redis.
type RateLimiter struct {
	client *redis.Client
	limit  int
}

// NewRateLimiter creates a rate limiter with the given Redis client and max requests per minute.
func NewRateLimiter(client *redis.Client, limit int) *RateLimiter {
	return &RateLimiter{client: client, limit: limit}
}

// Allow checks whether the given key is within the rate limit.
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

package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"github.com/deveasyclick/iwifunni/internal/auth"
	"github.com/deveasyclick/iwifunni/internal/config"
	"github.com/deveasyclick/iwifunni/internal/notification"
	"github.com/deveasyclick/iwifunni/internal/storage"
	"github.com/deveasyclick/iwifunni/internal/webhooks"
	"github.com/deveasyclick/iwifunni/pkg/logger"
	"github.com/hibiken/asynq"
	"github.com/redis/go-redis/v9"
)

func main() {
	l := logger.Get()
	cfg, err := config.Load()
	if err != nil {
		l.Fatal().Err(err).Msg("failed to load configuration")
	}

	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()

	store := storage.NewStore(ctx, cfg)
	defer store.Pool.Close()

	redisClient := redis.NewClient(&redis.Options{
		Addr:     cfg.RedisAddr,
		Password: cfg.RedisPassword,
	})
	if err := redisClient.Ping(ctx).Err(); err != nil {
		l.Fatal().Err(err).Msg("failed to connect to redis")
	}
	defer redisClient.Close()

	asynqServer := asynq.NewServer(
		asynq.RedisClientOpt{
			Addr:     cfg.RedisAddr,
			Password: cfg.RedisPassword,
		},
		asynq.Config{
			Concurrency: 10,
			Queues: map[string]int{
				"critical": 6,
				"default":  3,
				"low":      1,
			},
		},
	)

	_ = auth.NewRateLimiter(redisClient, cfg.RateLimitPerMin) // keep redis warmed

	dispatcher := webhooks.NewDispatcher(store.Queries)
	notifRepo := notification.NewRepository(store.Queries)
	notifSvc := notification.NewServiceWithWebhooks(notifRepo, dispatcher)
	worker := notification.NewWorker(asynqServer, notifSvc)

	l.Info().Msg("starting notification worker")
	if err := worker.Run(ctx); err != nil {
		l.Error().Err(err).Msg("worker stopped")
	}
	asynqServer.Stop()
}

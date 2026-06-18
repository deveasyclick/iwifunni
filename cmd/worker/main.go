package main

import (
	"context"
	"errors"
	"os"
	"os/signal"
	"syscall"

	"github.com/deveasyclick/iwifunni/internal/auth"
	"github.com/deveasyclick/iwifunni/internal/config"
	"github.com/deveasyclick/iwifunni/internal/notification"
	"github.com/deveasyclick/iwifunni/internal/queue"
	"github.com/deveasyclick/iwifunni/internal/storage"
	"github.com/deveasyclick/iwifunni/internal/webhooks"
	"github.com/deveasyclick/iwifunni/internal/workflow"
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

	asynqClient := asynq.NewClient(asynq.RedisClientOpt{
		Addr:     cfg.RedisAddr,
		Password: cfg.RedisPassword,
	})
	defer asynqClient.Close()

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
			IsFailure: func(err error) bool {
				return !errors.Is(err, asynq.SkipRetry)
			},
		},
	)

	_ = auth.NewRateLimiter(redisClient, cfg.RateLimitPerMin) // keep redis warmed

	producer := queue.NewProducer(asynqClient).WithTaskOptions(cfg.QueueMaxRetry, cfg.QueueTaskTimeout, cfg.QueueUniqueTTL)
	dispatcher := webhooks.NewDispatcher(store.Queries, producer)
	notifRepo := notification.NewRepository(store.Queries)
	notifSvc := notification.NewServiceWithWebhooks(notifRepo, dispatcher, cfg.EncryptionKey)
	workflowRepo := workflow.NewRepository(store.Queries)
	workflowSvc := workflow.NewService(workflowRepo).WithProducer(producer)
	notificationWorker := notification.NewWorker(asynqServer, notifSvc)
	workflowWorker := workflow.NewWorker(asynqServer, workflowSvc)
	webhookWorker := webhooks.NewWorker(dispatcher)
	mux := asynq.NewServeMux()
	notificationWorker.Register(mux)
	workflowWorker.Register(mux)
	webhookWorker.Register(mux)

	l.Info().Msg("starting notification worker")
	if err := asynqServer.Run(mux); err != nil {
		l.Error().Err(err).Msg("worker stopped")
	}
}

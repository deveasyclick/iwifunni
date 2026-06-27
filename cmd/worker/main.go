package main

import (
	"context"
	"errors"
	"os"
	"os/signal"
	"syscall"

	"github.com/deveasyclick/iwifunni/internal/config"
	"github.com/deveasyclick/iwifunni/internal/modules/notification"
	"github.com/deveasyclick/iwifunni/internal/utils/ratelimit"
	"github.com/deveasyclick/iwifunni/internal/modules/webhooks"
	"github.com/deveasyclick/iwifunni/internal/modules/workflow"
	"github.com/deveasyclick/iwifunni/internal/queue"
	"github.com/deveasyclick/iwifunni/internal/storage"
	"github.com/deveasyclick/iwifunni/pkg/logger"
	"github.com/hibiken/asynq"
	"github.com/redis/go-redis/v9"
)

func main() {
	l := logger.Get()
	cfg, err := config.Load()
	if err != nil {
		l.Error("failed to load configuration", "error", err)
		os.Exit(1)
	}

	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()

	store := storage.NewStore(ctx, cfg)
	defer store.Pool.Close()

	redisOpts, err := redis.ParseURL(cfg.RedisURL)
	if err != nil {
		l.Error("invalid redis url", "error", err)
		os.Exit(1)
	}
	redisClient := redis.NewClient(redisOpts)
	if err := redisClient.Ping(ctx).Err(); err != nil {
		l.Error("failed to connect to redis", "error", err)
		os.Exit(1)
	}
	defer redisClient.Close()

	asynqClient := asynq.NewClient(asynq.RedisClientOpt{
		Addr:     redisOpts.Addr,
		Password: redisOpts.Password,
		DB:       redisOpts.DB,
	})
	defer asynqClient.Close()

	asynqServer := asynq.NewServer(
		asynq.RedisClientOpt{
			Addr:     redisOpts.Addr,
			Password: redisOpts.Password,
			DB:       redisOpts.DB,
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

	_ = ratelimit.NewRateLimiter(redisClient, cfg.RateLimitPerMin) // keep redis warmed

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

	l.Info("starting notification worker")
	if err := asynqServer.Run(mux); err != nil {
		l.Error("worker stopped", "error", err)
	}
}

package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/deveasyclick/iwifunni/internal/app"
	"github.com/deveasyclick/iwifunni/internal/auth"
	"github.com/deveasyclick/iwifunni/internal/config"
	"github.com/deveasyclick/iwifunni/internal/queue"
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

	asynqClient := asynq.NewClient(asynq.RedisClientOpt{
		Addr:     cfg.RedisAddr,
		Password: cfg.RedisPassword,
	})
	defer asynqClient.Close()

	rateLimiter := auth.NewRateLimiter(redisClient, cfg.RateLimitPerMin)
	jwtManager := auth.NewJWTManager(cfg.JWTSecret, cfg.JWTIssuer, cfg.JWTAccessTokenTTL)
	authService := auth.NewService(store.Queries, jwtManager, cfg.JWTRefreshTokenTTL)
	dispatcher := webhooks.NewDispatcher(store.Queries)
	producer := queue.NewProducer(asynqClient)

	application := app.New(app.Config{
		Queries:       store.Queries,
		RateLimiter:   rateLimiter,
		AuthService:   authService,
		EncryptionKey: cfg.EncryptionKey,
		Producer:      producer,
		Dispatcher:    dispatcher,
	})

	httpServer := &http.Server{
		Addr:    fmt.Sprintf(":%s", cfg.APIServicePort),
		Handler: application.Router(),
	}

	l.Info().Msgf("starting API server on %s", httpServer.Addr)
	go func() {
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			l.Fatal().Err(err).Msg("API server failed")
		}
	}()

	<-ctx.Done()
	l.Info().Msg("shutting down API server")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()
	_ = httpServer.Shutdown(shutdownCtx)
}

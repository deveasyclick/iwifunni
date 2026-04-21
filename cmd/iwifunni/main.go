package main

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/hibiken/asynq"
	"github.com/redis/go-redis/v9"
	"google.golang.org/grpc"

	"github.com/deveasyclick/iwifunni/api/proto"
	"github.com/deveasyclick/iwifunni/internal/auth"
	"github.com/deveasyclick/iwifunni/internal/cli"
	"github.com/deveasyclick/iwifunni/internal/config"
	grpcapi "github.com/deveasyclick/iwifunni/internal/grpc"
	"github.com/deveasyclick/iwifunni/internal/handlers"
	"github.com/deveasyclick/iwifunni/internal/notifications"
	"github.com/deveasyclick/iwifunni/internal/storage"
	"github.com/deveasyclick/iwifunni/internal/worker"
	"github.com/deveasyclick/iwifunni/internal/ws"
	"github.com/deveasyclick/iwifunni/pkg/logger"
)

func main() {
	l := logger.Get()
	cfg, err := config.Load()
	if err != nil {
		l.Fatal().Err(err).Msg("failed to load configuration")
	}

	if handled, err := cli.Run(context.Background(), cfg, os.Args[1:]); handled {
		if err != nil {
			l.Fatal().Err(err).Msg("command failed")
		}
		return
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

	asynqClient := asynq.NewClient(asynq.RedisClientOpt{
		Addr:     cfg.RedisAddr,
		Password: cfg.RedisPassword,
	})
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

	wsServer := ws.NewServer()
	rateLimiter := auth.NewRateLimiter(redisClient, cfg.RateLimitPerMin)
	notifier := notifications.NewManager(*store.Queries, wsServer, cfg)
	queue := worker.NewProducer(asynqClient)
	consumer := worker.NewConsumer(asynqServer, notifier)

	apiHandler := handlers.NewHandler(store.Queries, queue, rateLimiter)
	router := apiHandler.Router(wsServer)

	grpcServer := grpc.NewServer()
	proto.RegisterNotificationServiceServer(grpcServer, grpcapi.NewService(store.Queries, queue, rateLimiter))

	httpServer := &http.Server{
		Addr:    fmt.Sprintf(":%s", cfg.APIServicePort),
		Handler: router,
	}

	go func() {
		l.Info().Msgf("starting REST API on %s", httpServer.Addr)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			l.Fatal().Err(err).Msg("REST server failed")
		}
	}()

	go func() {
		grpcAddr := fmt.Sprintf(":%s", cfg.GRPCServicePort)
		listener, err := net.Listen("tcp", grpcAddr)
		if err != nil {
			l.Fatal().Err(err).Msg("gRPC listener failed")
		}
		l.Info().Msgf("starting gRPC API on %s", grpcAddr)
		if err := grpcServer.Serve(listener); err != nil {
			l.Fatal().Err(err).Msg("gRPC server failed")
		}
	}()

	go func() {
		l.Info().Msg("starting notification consumer")
		if err := consumer.Run(ctx); err != nil {
			l.Error().Err(err).Msg("consumer stopped")
		}
	}()

	<-ctx.Done()
	l.Info().Msg("shutting down")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()
	_ = httpServer.Shutdown(shutdownCtx)
	grpcServer.GracefulStop()
	asynqServer.Stop()
	_ = asynqClient.Close()
	_ = redisClient.Close()
}

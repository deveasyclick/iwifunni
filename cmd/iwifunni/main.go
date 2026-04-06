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

	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"google.golang.org/grpc"

	"github.com/deveasyclick/iwifunni/api/proto"
	grpcapi "github.com/deveasyclick/iwifunni/internal/api/grpc"
	"github.com/deveasyclick/iwifunni/internal/api/rest"
	"github.com/deveasyclick/iwifunni/internal/auth"
	"github.com/deveasyclick/iwifunni/internal/config"
	"github.com/deveasyclick/iwifunni/internal/notifications"
	"github.com/deveasyclick/iwifunni/internal/storage"
	"github.com/deveasyclick/iwifunni/internal/worker"
	"github.com/deveasyclick/iwifunni/internal/ws"
)

func main() {
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	cfg, err := config.Load()
	if err != nil {
		log.Fatal().Err(err).Msg("failed to load configuration")
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
		log.Fatal().Err(err).Msg("failed to connect to redis")
	}

	wsServer := ws.NewServer()
	rateLimiter := auth.NewRateLimiter(redisClient, cfg.RateLimitPerMin)
	notifier := notifications.NewManager(*store.Queries, wsServer, cfg)
	queue := worker.NewProducer(redisClient)
	consumer := worker.NewConsumer(redisClient, notifier)

	apiHandler := rest.NewHandler(store.Queries, queue, rateLimiter)
	router := apiHandler.Router(wsServer)

	grpcServer := grpc.NewServer()
	proto.RegisterNotificationServiceServer(grpcServer, grpcapi.NewService(store.Queries, queue, rateLimiter))

	httpServer := &http.Server{
		Addr:    fmt.Sprintf(":%s", cfg.APIServicePort),
		Handler: router,
	}

	go func() {
		log.Info().Msgf("starting REST API on %s", httpServer.Addr)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("REST server failed")
		}
	}()

	go func() {
		grpcAddr := fmt.Sprintf(":%s", cfg.GRPCServicePort)
		listener, err := net.Listen("tcp", grpcAddr)
		if err != nil {
			log.Fatal().Err(err).Msg("gRPC listener failed")
		}
		log.Info().Msgf("starting gRPC API on %s", grpcAddr)
		if err := grpcServer.Serve(listener); err != nil {
			log.Fatal().Err(err).Msg("gRPC server failed")
		}
	}()

	go func() {
		log.Info().Msg("starting notification consumer")
		if err := consumer.Run(ctx); err != nil {
			log.Error().Err(err).Msg("consumer stopped")
		}
	}()

	<-ctx.Done()
	log.Info().Msg("shutting down")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()
	_ = httpServer.Shutdown(shutdownCtx)
	grpcServer.GracefulStop()
}

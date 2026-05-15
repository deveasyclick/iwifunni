package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/deveasyclick/iwifunni/internal/app"
	"github.com/deveasyclick/iwifunni/internal/auth"
	"github.com/deveasyclick/iwifunni/internal/config"
	"github.com/deveasyclick/iwifunni/internal/queue"
	"github.com/deveasyclick/iwifunni/internal/storage"
	"github.com/deveasyclick/iwifunni/internal/webhooks"
	"github.com/go-chi/chi/v5"
	"github.com/gorilla/sessions"
	"github.com/deveasyclick/iwifunni/pkg/logger"
	"github.com/hibiken/asynq"
	"github.com/markbates/goth"
	"github.com/markbates/goth/gothic"
	githubProvider "github.com/markbates/goth/providers/github"
	googleProvider "github.com/markbates/goth/providers/google"
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

	gothStore := sessions.NewCookieStore([]byte(cfg.GothSessionSecret))
	gothStore.MaxAge(86400 * 30)
	gothStore.Options.Path = "/"
	gothStore.Options.HttpOnly = true
	gothStore.Options.Secure = strings.HasPrefix(strings.ToLower(cfg.WebBaseURL), "https://")
	gothStore.Options.SameSite = http.SameSiteLaxMode
	gothic.Store = gothStore
	gothic.GetProviderName = func(r *http.Request) (string, error) {
		provider := chi.URLParam(r, "provider")
		if provider == "" {
			provider = r.URL.Query().Get("provider")
		}
		if provider == "" {
			return "", fmt.Errorf("missing social provider")
		}
		return provider, nil
	}

	apiPublicBaseURL := strings.TrimRight(cfg.APIPublicBaseURL, "/")
	socialProviders := make(map[string]bool)
	providers := make([]goth.Provider, 0, 2)
	if cfg.GoogleClientID != "" && cfg.GoogleClientSecret != "" {
		providers = append(providers, googleProvider.New(
			cfg.GoogleClientID,
			cfg.GoogleClientSecret,
			apiPublicBaseURL+"/auth/social/google/callback",
			"email",
			"profile",
		))
		socialProviders["google"] = true
	}
	if cfg.GitHubClientID != "" && cfg.GitHubClientSecret != "" {
		providers = append(providers, githubProvider.New(
			cfg.GitHubClientID,
			cfg.GitHubClientSecret,
			apiPublicBaseURL+"/auth/social/github/callback",
			"user:email",
		))
		socialProviders["github"] = true
	}
	if len(providers) > 0 {
		goth.UseProviders(providers...)
	}

	rateLimiter := auth.NewRateLimiter(redisClient, cfg.RateLimitPerMin)
	jwtManager := auth.NewJWTManager(cfg.JWTSecret, cfg.JWTIssuer, cfg.JWTAccessTokenTTL)
	authService := auth.NewService(
		store.Queries,
		jwtManager,
		cfg.JWTRefreshTokenTTL,
		auth.WithVerificationTTL(cfg.AuthVerificationTTL),
		auth.WithVerificationSender(func(_ context.Context, email, code string) error {
			l.Info().Str("email", email).Str("verification_code", code).Msg("signup verification code generated")
			return nil
		}),
	)
	producer := queue.NewProducer(asynqClient).WithTaskOptions(cfg.QueueMaxRetry, cfg.QueueTaskTimeout, cfg.QueueUniqueTTL)
	dispatcher := webhooks.NewDispatcher(store.Queries, producer)

	application := app.New(app.Config{
		Queries:       store.Queries,
		RateLimiter:   rateLimiter,
		AuthService:   authService,
		JWTManager:    jwtManager,
		FrontendBaseURL: cfg.WebBaseURL,
		SocialProviders: socialProviders,
		CookieSecure: strings.HasPrefix(strings.ToLower(cfg.WebBaseURL), "https://"),
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

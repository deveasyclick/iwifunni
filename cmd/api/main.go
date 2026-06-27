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
	"github.com/deveasyclick/iwifunni/internal/config"
	"github.com/deveasyclick/iwifunni/internal/shared/mailer"
	modauth "github.com/deveasyclick/iwifunni/internal/modules/auth"
	jwtutil "github.com/deveasyclick/iwifunni/internal/utils/jwt"
	"github.com/deveasyclick/iwifunni/internal/utils/ratelimit"
	"github.com/deveasyclick/iwifunni/internal/modules/webhooks"
	"github.com/deveasyclick/iwifunni/internal/queue"
	"github.com/deveasyclick/iwifunni/internal/storage"
	"github.com/deveasyclick/iwifunni/pkg/logger"
	"github.com/go-chi/chi/v5"
	"github.com/gorilla/sessions"
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

	jwtutil.Init(cfg.JWTSecret, cfg.JWTIssuer, cfg.JWTAccessTokenTTL)

	rateLimiter := ratelimit.NewRateLimiter(redisClient, cfg.RateLimitPerMin)
	m := mailer.New(cfg.BrevoAPIKey, cfg.BrevoFromEmail)
	authService := modauth.NewService(store.Queries, cfg.JWTRefreshTokenTTL, cfg.AuthVerificationTTL, m)
	producer := queue.NewProducer(asynqClient).WithTaskOptions(cfg.QueueMaxRetry, cfg.QueueTaskTimeout, cfg.QueueUniqueTTL)
	dispatcher := webhooks.NewDispatcher(store.Queries, producer)

	authHandler := modauth.NewHandler(authService, modauth.Config{
		FrontendBaseURL: cfg.WebBaseURL,
		SocialProviders: socialProviders,
		CookieSecure:    strings.HasPrefix(strings.ToLower(cfg.WebBaseURL), "https://"),
		Queries:         store.Queries,
	})

	application := app.New(app.Config{
		Queries:       store.Queries,
		DBPool:        store.Pool,
		RateLimiter:   rateLimiter,
		AuthHandler:   authHandler,
		EncryptionKey: cfg.EncryptionKey,
		Producer:      producer,
		Dispatcher:    dispatcher,
	})

	httpServer := &http.Server{
		Addr:    fmt.Sprintf(":%s", cfg.APIServicePort),
		Handler: application.Router(),
	}

	l.Info(fmt.Sprintf("starting API server on %s", httpServer.Addr))
	go func() {
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			l.Error("API server failed", "error", err)
			os.Exit(1)
		}
	}()

	<-ctx.Done()
	l.Info("shutting down API server")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()
	_ = httpServer.Shutdown(shutdownCtx)
}

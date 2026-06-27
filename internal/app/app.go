package app

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/deveasyclick/iwifunni/internal/db/gen"
	modauth "github.com/deveasyclick/iwifunni/internal/modules/auth"
	"github.com/deveasyclick/iwifunni/internal/modules/webhooks"
	"github.com/deveasyclick/iwifunni/internal/queue"
	"github.com/deveasyclick/iwifunni/internal/utils/ratelimit"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

// App wires all domain handlers and builds the HTTP router.
type App struct {
	queries         *db.Queries
	rateLimiter     *ratelimit.RateLimiter
	authHandler     *modauth.Handler
	frontendBaseURL string
	dbPool          *pgxpool.Pool
	redisClient     *redis.Client
	encryptionKey   string
	producer        *queue.Producer
	dispatcher      *webhooks.Dispatcher
}

// Config carries the dependencies needed to create an App.
type Config struct {
	Queries         *db.Queries
	DBPool          *pgxpool.Pool
	RedisClient     *redis.Client
	RateLimiter     *ratelimit.RateLimiter
	AuthHandler     *modauth.Handler
	FrontendBaseURL string
	EncryptionKey   string
	Producer        *queue.Producer
	Dispatcher      *webhooks.Dispatcher
}

// New creates a new App with the given configuration.
func New(cfg Config) *App {
	return &App{
		queries:         cfg.Queries,
		dbPool:          cfg.DBPool,
		redisClient:     cfg.RedisClient,
		rateLimiter:     cfg.RateLimiter,
		authHandler:     cfg.AuthHandler,
		frontendBaseURL: cfg.FrontendBaseURL,
		encryptionKey:   cfg.EncryptionKey,
		producer:        cfg.Producer,
		dispatcher:      cfg.Dispatcher,
	}
}

// healthCheck responds with the service status.
func (a *App) healthCheck(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	dbOK := true
	if err := a.dbPool.Ping(ctx); err != nil {
		dbOK = false
	}

	redisOK := true
	if err := a.redisClient.Ping(ctx).Err(); err != nil {
		redisOK = false
	}

	status := "ok"
	if !dbOK || !redisOK {
		status = "degraded"
	}

	hc := map[string]any{
		"status": status,
		"time":   time.Now().UTC().Format(time.RFC3339),
		"checks": map[string]string{
			"database":    map[bool]string{true: "ok", false: "down"}[dbOK],
			"redis":       map[bool]string{true: "ok", false: "down"}[redisOK],
		},
	}

	w.Header().Set("Content-Type", "application/json")
	if status != "ok" {
		w.WriteHeader(http.StatusServiceUnavailable)
	}
	_ = json.NewEncoder(w).Encode(hc)
}

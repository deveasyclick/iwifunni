package app

import (
	"github.com/deveasyclick/iwifunni/internal/db/gen"
	modauth "github.com/deveasyclick/iwifunni/internal/modules/auth"
	"github.com/deveasyclick/iwifunni/internal/modules/webhooks"
	"github.com/deveasyclick/iwifunni/internal/queue"
	"github.com/deveasyclick/iwifunni/internal/utils/ratelimit"
	"github.com/jackc/pgx/v5/pgxpool"
)

// App wires all domain handlers and builds the HTTP router.
type App struct {
	queries         *db.Queries
	rateLimiter     *ratelimit.RateLimiter
	authHandler     *modauth.Handler
	frontendBaseURL string
	dbPool          *pgxpool.Pool
	encryptionKey   string
	producer        *queue.Producer
	dispatcher      *webhooks.Dispatcher
}

// Config carries the dependencies needed to create an App.
type Config struct {
	Queries         *db.Queries
	DBPool          *pgxpool.Pool
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
		rateLimiter:     cfg.RateLimiter,
		authHandler:     cfg.AuthHandler,
		frontendBaseURL: cfg.FrontendBaseURL,
		encryptionKey:   cfg.EncryptionKey,
		producer:        cfg.Producer,
		dispatcher:      cfg.Dispatcher,
	}
}

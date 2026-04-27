package app

import (
	"net/http"

	apikey "github.com/deveasyclick/iwifunni/internal/api_key"
	"github.com/deveasyclick/iwifunni/internal/auth"
	"github.com/deveasyclick/iwifunni/internal/db"
	"github.com/deveasyclick/iwifunni/internal/notification"
	"github.com/deveasyclick/iwifunni/internal/organization"
	"github.com/deveasyclick/iwifunni/internal/project"
	"github.com/deveasyclick/iwifunni/internal/provider"
	"github.com/deveasyclick/iwifunni/internal/queue"
	"github.com/deveasyclick/iwifunni/internal/templates"
	"github.com/deveasyclick/iwifunni/internal/webhooks"
	"github.com/go-chi/chi/v5"
)

// App wires all domain handlers and builds the HTTP router.
type App struct {
	queries       *db.Queries
	rateLimiter   *auth.RateLimiter
	authService   authServiceFull
	encryptionKey string
	producer      *queue.Producer
	dispatcher    *webhooks.Dispatcher
}

type Config struct {
	Queries       *db.Queries
	RateLimiter   *auth.RateLimiter
	AuthService   authServiceFull
	EncryptionKey string
	Producer      *queue.Producer
	Dispatcher    *webhooks.Dispatcher
}

func New(cfg Config) *App {
	return &App{
		queries:       cfg.Queries,
		rateLimiter:   cfg.RateLimiter,
		authService:   cfg.AuthService,
		encryptionKey: cfg.EncryptionKey,
		producer:      cfg.Producer,
		dispatcher:    cfg.Dispatcher,
	}
}

func (a *App) Router() http.Handler {
	r := chi.NewRouter()

	// Auth routes (no auth middleware)
	r.Post("/auth/signup", a.authHandler().signup)
	r.Post("/auth/signin", a.authHandler().signin)
	r.Post("/auth/refresh", a.authHandler().refresh)
	r.Post("/auth/logout", a.authHandler().logout)

	// Protected routes
	r.Group(func(r chi.Router) {
		r.Use(auth.NewAuthMiddleware(a.queries, a.rateLimiter))

		// Notifications
		notifRepo := notification.NewRepository(a.queries)
		notifSvc := notification.NewServiceWithWebhooks(notifRepo, a.dispatcher)
		notification.NewHandler(notifSvc, a.producer).Register(r)

		// Templates
		tplRepo := templates.NewRepository(a.queries)
		tplSvc := templates.NewService(tplRepo)
		templates.NewHandler(tplSvc).Register(r)

		// Providers
		providerRepo := provider.NewRepository(a.queries)
		providerSvc := provider.NewService(providerRepo, a.encryptionKey)
		provider.NewHandler(providerSvc).Register(r)

		// API Keys
		apikeyRepo := apikey.NewRepository(a.queries)
		apikeySvc := apikey.NewService(apikeyRepo)
		apikey.NewHandler(apikeySvc).Register(r)

		// Webhooks
		webhookSvc := webhooks.NewService(a.queries, a.dispatcher)
		webhooks.NewHandler(webhookSvc).Register(r)

		// Organizations
		orgRepo := organization.NewRepository(a.queries)
		orgSvc := organization.NewService(orgRepo)
		organization.NewHandler(orgSvc).Register(r)

		// Projects
		projectRepo := project.NewRepository(a.queries)
		projectSvc := project.NewService(projectRepo)
		project.NewHandler(projectSvc).Register(r)
	})

	return r
}

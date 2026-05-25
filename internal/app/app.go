package app

import (
	"net/http"
	"time"

	apikey "github.com/deveasyclick/iwifunni/internal/api_key"
	"github.com/deveasyclick/iwifunni/internal/auth"
	"github.com/deveasyclick/iwifunni/internal/db"
	"github.com/deveasyclick/iwifunni/internal/notification"
	"github.com/deveasyclick/iwifunni/internal/organization"
	"github.com/deveasyclick/iwifunni/internal/provider"
	"github.com/deveasyclick/iwifunni/internal/queue"
	"github.com/deveasyclick/iwifunni/internal/subscriber"
	"github.com/deveasyclick/iwifunni/internal/templates"
	"github.com/deveasyclick/iwifunni/internal/webhooks"
	"github.com/deveasyclick/iwifunni/internal/workflow"
	"github.com/deveasyclick/iwifunni/pkg/logger"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// App wires all domain handlers and builds the HTTP router.
type App struct {
	queries         *db.Queries
	rateLimiter     *auth.RateLimiter
	authService     authServiceFull
	jwtManager      *auth.JWTManager
	frontendBaseURL string
	dbPool          *pgxpool.Pool
	socialProviders map[string]bool
	cookieSecure    bool
	encryptionKey   string
	producer        *queue.Producer
	dispatcher      *webhooks.Dispatcher
}

type Config struct {
	Queries         *db.Queries
	DBPool          *pgxpool.Pool
	RateLimiter     *auth.RateLimiter
	AuthService     authServiceFull
	JWTManager      *auth.JWTManager
	FrontendBaseURL string
	SocialProviders map[string]bool
	CookieSecure    bool
	EncryptionKey   string
	Producer        *queue.Producer
	Dispatcher      *webhooks.Dispatcher
}

func New(cfg Config) *App {
	return &App{
		queries:         cfg.Queries,
		dbPool:          cfg.DBPool,
		rateLimiter:     cfg.RateLimiter,
		authService:     cfg.AuthService,
		jwtManager:      cfg.JWTManager,
		frontendBaseURL: cfg.FrontendBaseURL,
		socialProviders: cfg.SocialProviders,
		cookieSecure:    cfg.CookieSecure,
		encryptionKey:   cfg.EncryptionKey,
		producer:        cfg.Producer,
		dispatcher:      cfg.Dispatcher,
	}
}

func (a *App) Router() http.Handler {
	r := chi.NewRouter()

	r.Use(httpLogger)

	// Auth routes (no auth middleware)
	r.Post("/auth/signup", a.authHandler().signup)
	r.Post("/auth/verify-email", a.authHandler().verifyEmail)
	r.Post("/auth/signin", a.authHandler().signin)
	r.Post("/auth/refresh", a.authHandler().refresh)
	r.Post("/auth/logout", a.authHandler().logout)
	r.Get("/auth/social/{provider}", a.authHandler().socialStart)
	r.Get("/auth/social/{provider}/callback", a.authHandler().socialCallback)

	// Protected routes
	r.Group(func(r chi.Router) {
		r.Use(auth.NewJWTMiddleware(a.jwtManager, a.queries))
		r.Post("/auth/onboarding", a.authHandler().completeOnboarding)

		// API Keys management (dashboard)
		apikeyRepo := apikey.NewRepository(a.queries)
		apikeySvc := apikey.NewService(apikeyRepo)
		apikey.NewHandler(apikeySvc).Register(r)

		// Notification reads (dashboard)
		notifRepo := notification.NewRepository(a.queries)
		notifSvc := notification.NewServiceWithWebhooks(notifRepo, a.dispatcher, a.encryptionKey)
		notification.NewHandler(notifSvc, a.producer).RegisterReadRoutes(r)

		// Provider management (dashboard)
		providerRepo := provider.NewRepository(a.queries, a.dbPool)
		providerSvc := provider.NewService(providerRepo, a.encryptionKey)
		provider.NewHandler(providerSvc).Register(r)

		// Template management (dashboard)
		tplRepo := templates.NewRepository(a.queries)
		tplSvc := templates.NewService(tplRepo)
		templates.NewHandler(tplSvc).RegisterDashboardRoutes(r)

		// Subscriber management (dashboard)
		subscriberRepo := subscriber.NewRepository(a.queries)
		subscriberSvc := subscriber.NewService(subscriberRepo)
		subscriber.NewHandler(subscriberSvc).Register(r)

		// Workflow management (dashboard)
		workflowRepo := workflow.NewRepository(a.queries)
		workflowSvc := workflow.NewService(workflowRepo).WithProducer(a.producer)
		workflow.NewHandler(workflowSvc).RegisterDashboardRoutes(r)

		// Webhook management (dashboard)
		webhookSvc := webhooks.NewService(a.queries, a.dispatcher)
		webhooks.NewHandler(webhookSvc).Register(r)
	})

	r.Group(func(r chi.Router) {
		r.Use(auth.NewAuthMiddleware(a.queries, a.rateLimiter))

		// Notifications
		notifRepo := notification.NewRepository(a.queries)
		notifSvc := notification.NewServiceWithWebhooks(notifRepo, a.dispatcher, a.encryptionKey)
		notification.NewHandler(notifSvc, a.producer).RegisterSendRoutes(r)

		// Templates
		tplRepo := templates.NewRepository(a.queries)
		tplSvc := templates.NewService(tplRepo)
		templates.NewHandler(tplSvc).RegisterAPIRoutes(r)

		// Subscribers
		subscriberRepo := subscriber.NewRepository(a.queries)
		subscriberSvc := subscriber.NewService(subscriberRepo)
		subscriber.NewHandler(subscriberSvc).Register(r)

		// Workflows
		workflowRepo := workflow.NewRepository(a.queries)
		workflowSvc := workflow.NewService(workflowRepo).WithProducer(a.producer)
		workflow.NewHandler(workflowSvc).RegisterAPIRoutes(r)

		// Webhooks
		webhookSvc := webhooks.NewService(a.queries, a.dispatcher)
		webhooks.NewHandler(webhookSvc).Register(r)

		// Organizations
		orgRepo := organization.NewRepository(a.queries)
		orgSvc := organization.NewService(orgRepo)
		organization.NewHandler(orgSvc).Register(r)

	})

	return r
}

// httpLogger is a zerolog-based HTTP request logging middleware.
func httpLogger(next http.Handler) http.Handler {
	log := logger.Get()
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		ww := &responseWriter{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(ww, r)
		log.Info().
			Str("method", r.Method).
			Str("path", r.URL.Path).
			Int("status", ww.status).
			Dur("duration", time.Since(start)).
			Str("remote", r.RemoteAddr).
			Msg("http request")
	})
}

type responseWriter struct {
	http.ResponseWriter
	status int
}

func (rw *responseWriter) WriteHeader(status int) {
	rw.status = status
	rw.ResponseWriter.WriteHeader(status)
}

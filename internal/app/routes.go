package app

import (
	"net/http"

	_ "github.com/deveasyclick/iwifunni/docs"
	"github.com/deveasyclick/iwifunni/internal/middleware"

	apikey "github.com/deveasyclick/iwifunni/internal/modules/apikey"
	"github.com/go-chi/cors"
	httpSwagger "github.com/swaggo/http-swagger/v2"

	"github.com/deveasyclick/iwifunni/internal/modules/integration"
	"github.com/deveasyclick/iwifunni/internal/modules/notification"
	"github.com/deveasyclick/iwifunni/internal/modules/organization"
	"github.com/deveasyclick/iwifunni/internal/modules/stats"
	"github.com/deveasyclick/iwifunni/internal/modules/subscriber"
	"github.com/deveasyclick/iwifunni/internal/modules/templates"
	"github.com/deveasyclick/iwifunni/internal/modules/workflow"
	"github.com/go-chi/chi/v5"
)

func (a *App) Router() http.Handler {
	r := chi.NewRouter()

	// Global CORS — must be first so preflight OPTIONS requests are handled
	// before any auth middleware.
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000", "https://iwifunni.cc"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token", "browserrefreshed"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Use(middleware.HTTPLogger)

	a.registerRoutes(r)

	return r
}

func (a *App) registerRoutes(r chi.Router) {
	// Health check (no auth)
	r.Get("/health", a.healthCheck)

	// Swagger UI
	r.Get("/swagger/*", httpSwagger.Handler())

	// Auth routes (no auth middleware)
	a.authHandler.Register(r)

	// JWT Protected routes
	r.Group(func(r chi.Router) {
		r.Use(middleware.NewJWTMiddleware(a.queries))
		a.authHandler.RegisterProtectedRoutes(r)

		// API Keys management (dashboard)
		apikeyRepo := apikey.NewRepository(a.queries)
		apikeySvc := apikey.NewService(apikeyRepo)
		apikey.NewHandler(apikeySvc).Register(r)

		// Notification reads + test sends (dashboard)
		notifRepo := notification.NewRepository(a.queries)
		notifSvc := notification.NewServiceWithWebhooks(notifRepo, a.dispatcher, a.encryptionKey)
		notifHandler := notification.NewHandler(notifSvc, a.producer)
		notifHandler.RegisterReadRoutes(r)
		notifHandler.RegisterDashboardSendRoutes(r)

		// Integration management (dashboard)
		integrationRepo := integration.NewRepository(a.queries, a.dbPool)
		integrationSvc := integration.NewService(integrationRepo, a.encryptionKey)
		integration.NewHandler(integrationSvc, a.queries).Register(r)

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

		// Dashboard stats
		statsRepo := stats.NewRepository(a.queries)
		statsSvc := stats.NewService(statsRepo)
		stats.NewHandler(statsSvc).Register(r)

	})
	// API key protected group
	r.Group(func(r chi.Router) {
		r.Use(middleware.NewAuthMiddleware(a.queries, a.rateLimiter))

		// Notifications
		notifRepo := notification.NewRepository(a.queries)
		notifSvc := notification.NewServiceWithWebhooks(notifRepo, a.dispatcher, a.encryptionKey)
		notification.NewHandler(notifSvc, a.producer).RegisterSendRoutes(r)

		// Workflows
		workflowRepo := workflow.NewRepository(a.queries)
		workflowSvc := workflow.NewService(workflowRepo).WithProducer(a.producer)
		workflow.NewHandler(workflowSvc).RegisterAPIRoutes(r)

		// Organizations
		orgRepo := organization.NewRepository(a.queries)
		orgSvc := organization.NewService(orgRepo)
		organization.NewHandler(orgSvc).Register(r)
	})
}

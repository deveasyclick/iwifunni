package testutil

import (
	"context"
	"net/http/httptest"
	"time"

	"github.com/deveasyclick/iwifunni/internal/app"
	modauth "github.com/deveasyclick/iwifunni/internal/modules/auth"
	"github.com/deveasyclick/iwifunni/internal/modules/webhooks"
	"github.com/deveasyclick/iwifunni/internal/queue"
	"github.com/deveasyclick/iwifunni/internal/shared/mailer"
	jwtutil "github.com/deveasyclick/iwifunni/internal/utils/jwt"
	"github.com/deveasyclick/iwifunni/internal/utils/ratelimit"
	"github.com/hibiken/asynq"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

// TestApp wraps an httptest.Server with the application and exposes helpers.
type TestApp struct {
	Server  *httptest.Server
	App     *app.App
	DB      *pgxpool.Pool
	Redis   *redis.Client
	BaseURL string
	cleanup func()
}

// NewTestApp creates a fully wired application for integration tests.
func NewTestApp() (*TestApp, error) {
	pool, _, err := InitTestDB()
	if err != nil {
		return nil, err
	}

	redisAddr := envOrDefault("TEST_REDIS_ADDR", "localhost:6380")
	redisPassword := envOrDefault("TEST_REDIS_PASSWORD", "123456")

	redisClient := redis.NewClient(&redis.Options{
		Addr:     redisAddr,
		Password: redisPassword,
		DB:       1, // separate DB to avoid interfering with dev
	})
	if err := redisClient.Ping(context.Background()).Err(); err != nil {
		pool.Close()
		return nil, err
	}

	jwtSecret := randomHex(32)
	jwtutil.Init(jwtSecret, "test-iwifunni", 15*time.Minute)

	rateLimiter := ratelimit.NewRateLimiter(redisClient, 10000)

	asynqClient := asynq.NewClient(asynq.RedisClientOpt{
		Addr:     redisAddr,
		Password: redisPassword,
		DB:       1,
	})
	producer := queue.NewProducer(asynqClient).
		WithTaskOptions(5, 2*time.Minute, 5*time.Minute)

	dispatcher := webhooks.NewDispatcher(Queries(), producer)

	noopMail := mailer.New("", "")
	authService := modauth.NewService(Queries(), 720*time.Hour, 15*time.Minute, noopMail)
	authHandler := modauth.NewHandler(authService, modauth.Config{
		FrontendBaseURL: "http://localhost:3000",
		SocialProviders: map[string]bool{},
		CookieSecure:    false,
		Queries:         Queries(),
	})

	encryptionKey := randomHex(32)

	application := app.New(app.Config{
		Queries:       Queries(),
		DBPool:        pool,
		RedisClient:   redisClient,
		RateLimiter:   rateLimiter,
		AuthHandler:   authHandler,
		EncryptionKey: encryptionKey,
		Producer:      producer,
		Dispatcher:    dispatcher,
	}, "", "")

	server := httptest.NewServer(application.Router())

	return &TestApp{
		Server:  server,
		App:     application,
		DB:      pool,
		Redis:   redisClient,
		BaseURL: server.URL,
		cleanup: func() {
			server.Close()
			redisClient.Close()
			asynqClient.Close()
		},
	}, nil
}

// Close shuts down the test server and releases resources.
func (ta *TestApp) Close() {
	ta.cleanup()
}


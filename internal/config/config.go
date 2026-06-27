package config

import (
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL        string
	RedisURL           string
	APIServicePort     string
	BrevoAPIKey        string
	BrevoFromEmail     string
	RateLimitPerMin    int
	JWTSecret          string
	JWTIssuer          string
	JWTAccessTokenTTL  time.Duration
	JWTRefreshTokenTTL time.Duration
	AuthVerificationTTL time.Duration
	WebBaseURL         string
	APIPublicBaseURL   string
	GothSessionSecret  string
	GoogleClientID     string
	GoogleClientSecret string
	GitHubClientID     string
	GitHubClientSecret string
	Environment        string
	EncryptionKey      string
	QueueMaxRetry      int
	QueueTaskTimeout   time.Duration
	QueueUniqueTTL     time.Duration
}

func Load() (*Config, error) {
	_ = godotenv.Load()

	rateLimit, err := strconv.Atoi(getenvDefault("RATE_LIMIT_PER_MINUTE", "60"))
	if err != nil {
		return nil, fmt.Errorf("invalid RATE_LIMIT_PER_MINUTE: %w", err)
	}

	jwtAccessTokenTTL, err := time.ParseDuration(getenvDefault("JWT_ACCESS_TOKEN_TTL", "15m"))
	if err != nil {
		return nil, fmt.Errorf("invalid JWT_ACCESS_TOKEN_TTL: %w", err)
	}

	jwtRefreshTokenTTL, err := time.ParseDuration(getenvDefault("JWT_REFRESH_TOKEN_TTL", "720h"))
	if err != nil {
		return nil, fmt.Errorf("invalid JWT_REFRESH_TOKEN_TTL: %w", err)
	}

	authVerificationTTL, err := time.ParseDuration(getenvDefault("AUTH_VERIFICATION_TTL", "15m"))
	if err != nil {
		return nil, fmt.Errorf("invalid AUTH_VERIFICATION_TTL: %w", err)
	}

	queueMaxRetry, err := strconv.Atoi(getenvDefault("QUEUE_MAX_RETRY", "5"))
	if err != nil {
		return nil, fmt.Errorf("invalid QUEUE_MAX_RETRY: %w", err)
	}

	queueTaskTimeout, err := time.ParseDuration(getenvDefault("QUEUE_TASK_TIMEOUT", "2m"))
	if err != nil {
		return nil, fmt.Errorf("invalid QUEUE_TASK_TIMEOUT: %w", err)
	}

	queueUniqueTTL, err := time.ParseDuration(getenvDefault("QUEUE_UNIQUE_TTL", "5m"))
	if err != nil {
		return nil, fmt.Errorf("invalid QUEUE_UNIQUE_TTL: %w", err)
	}

	return &Config{
		DatabaseURL:        getenvDefault("DATABASE_URL", "postgres://iwifunni:iwifunni@localhost:5432/iwifunni?sslmode=disable"),
		RedisURL:           getenvDefault("REDIS_URL", "redis://localhost:6379"),
		APIServicePort:     getenvDefault("API_PORT", "8080"),
		BrevoAPIKey:        os.Getenv("BREVO_API_KEY"),
		BrevoFromEmail:     os.Getenv("BREVO_FROM_EMAIL"),
		RateLimitPerMin:    rateLimit,
		JWTSecret:          getenvDefault("JWT_SECRET", "development-jwt-secret-change-me"),
		JWTIssuer:          getenvDefault("JWT_ISSUER", "iwifunni"),
		JWTAccessTokenTTL:  jwtAccessTokenTTL,
		JWTRefreshTokenTTL: jwtRefreshTokenTTL,
		AuthVerificationTTL: authVerificationTTL,
		WebBaseURL:         getenvDefault("WEB_BASE_URL", "http://localhost:3000"),
		APIPublicBaseURL:   getenvDefault("API_PUBLIC_BASE_URL", getenvDefault("API_BASE_URL", "http://localhost:8080")),
		GothSessionSecret:  getenvDefault("GOTH_SESSION_SECRET", "development-goth-session-secret-change-me"),
		GoogleClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		GoogleClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		GitHubClientID:     os.Getenv("GITHUB_CLIENT_ID"),
		GitHubClientSecret: os.Getenv("GITHUB_CLIENT_SECRET"),
		Environment:        getenvDefault("ENVIRONMENT", "development"),
		EncryptionKey:      getenvDefault("ENCRYPTION_KEY", "dev-encryption-key-32bytes-padded"),
		QueueMaxRetry:      queueMaxRetry,
		QueueTaskTimeout:   queueTaskTimeout,
		QueueUniqueTTL:     queueUniqueTTL,
	}, nil
}

func getenvDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

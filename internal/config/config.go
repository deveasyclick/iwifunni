package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
    DatabaseURL     string
    RedisAddr       string
    RedisPassword   string
    APIServicePort  string
    GRPCServicePort string
    FCMServerKey    string
    WebPushKey      string
    WebPushSecret   string
    BrevoAPIKey     string
    MailerHost      string
    MailerPort      int
    MailerUsername  string
    MailerPassword  string
    MailerFrom      string
    TermiiAPIKey    string
    TermiiSenderID  string
    RateLimitPerMin int
	Environment     string
}

func Load() (*Config, error) {
    _ = godotenv.Load()

    rateLimit, err := strconv.Atoi(getenvDefault("RATE_LIMIT_PER_MINUTE", "60"))
    if err != nil {
        return nil, fmt.Errorf("invalid RATE_LIMIT_PER_MINUTE: %w", err)
    }

    mailerPort, err := strconv.Atoi(getenvDefault("MAILER_PORT", "587"))
    if err != nil {
        return nil, fmt.Errorf("invalid MAILER_PORT: %w", err)
    }

    mailerPassword := os.Getenv("MAILER_PASSWORD")
    if mailerPassword == "" {
        mailerPassword = os.Getenv("BREVO_API_KEY")
    }

    return &Config{
        DatabaseURL:     getenvDefault("DATABASE_URL", "postgres://iwifunni:iwifunni@localhost:5432/iwifunni?sslmode=disable"),
        RedisAddr:       getenvDefault("REDIS_ADDR", "localhost:6379"),
        RedisPassword:   os.Getenv("REDIS_PASSWORD"),
        APIServicePort:  getenvDefault("API_PORT", "8080"),
        GRPCServicePort: getenvDefault("GRPC_PORT", "9090"),
        FCMServerKey:    os.Getenv("FCM_SERVER_KEY"),
        WebPushKey:      os.Getenv("WEBPUSH_PUBLIC_KEY"),
        WebPushSecret:   os.Getenv("WEBPUSH_PRIVATE_KEY"),
        BrevoAPIKey:     os.Getenv("BREVO_API_KEY"),
        MailerHost:      getenvDefault("MAILER_HOST", "smtp-relay.brevo.com"),
        MailerPort:      mailerPort,
        MailerUsername:  getenvDefault("MAILER_USERNAME", "apikey"),
        MailerPassword:  mailerPassword,
        MailerFrom:      os.Getenv("MAILER_FROM"),
        TermiiAPIKey:    os.Getenv("TERMII_API_KEY"),
        TermiiSenderID:  getenvDefault("TERMII_SENDER_ID", "iwifunni"),
        RateLimitPerMin: rateLimit,
		Environment:     getenvDefault("ENVIRONMENT", "development"),
    }, nil
}

func getenvDefault(key, fallback string) string {
    if v := os.Getenv(key); v != "" {
        return v
    }
    return fallback
}

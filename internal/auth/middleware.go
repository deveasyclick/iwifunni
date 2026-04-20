package auth

import (
	"context"
	"net/http"
	"strings"

	"github.com/deveasyclick/iwifunni/internal/db"
	"github.com/deveasyclick/iwifunni/pkg/logger"
)

type contextKey string

const ServiceContextKey contextKey = "service"

func NewAuthMiddleware(queries *db.Queries, limiter *RateLimiter) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			header := r.Header.Get("Authorization")
			if header == "" || !strings.HasPrefix(header, "ApiKey ") {
				http.Error(w, "missing api key", http.StatusUnauthorized)
				return
			}

			apiKey := strings.TrimPrefix(header, "ApiKey ")
			svc, err := queries.GetServiceByAPIKey(r.Context(), apiKey)
			if err != nil {
				http.Error(w, "invalid service api key", http.StatusUnauthorized)
				return
			}

			ok, err := limiter.Allow(r.Context(), svc.ID.String())
			if err != nil {
				logger.Get().Error().Err(err).Msg("rate limiter error")
				http.Error(w, "rate limiter unavailable", http.StatusInternalServerError)
				return
			}
			if !ok {
				http.Error(w, "rate limit exceeded", http.StatusTooManyRequests)
				return
			}

			ctx := context.WithValue(r.Context(), ServiceContextKey, svc)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func GetService(ctx context.Context) *db.Service {
	if svc, ok := ctx.Value(ServiceContextKey).(*db.Service); ok {
		return svc
	}
	return nil
}

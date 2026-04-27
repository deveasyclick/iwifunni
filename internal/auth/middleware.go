package auth

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/deveasyclick/iwifunni/internal/db"
	"github.com/deveasyclick/iwifunni/pkg/logger"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

type contextKey string

const (
	ServiceContextKey contextKey = "service"
	ProjectContextKey contextKey = "project_auth"
)

type authQueries interface {
	GetAPIKeyByPrefix(context.Context, string) (db.ApiKey, error)
	TouchAPIKeyLastUsed(context.Context, db.TouchAPIKeyLastUsedParams) error
	GetServiceByAPIKey(context.Context, string) (db.Service, error)
}

type requestLimiter interface {
	Allow(context.Context, string) (bool, error)
}

type AuthenticatedProject struct {
	ProjectID uuid.UUID
	APIKeyID  uuid.UUID
	APIKey    string
	Scopes    []string
	Status    string
}

func NewAuthMiddleware(queries authQueries, limiter requestLimiter) func(http.Handler) http.Handler {
	return newAuthMiddleware(queries, limiter, func() time.Time {
		return time.Now().UTC()
	})
}

func newAuthMiddleware(queries authQueries, limiter requestLimiter, now func() time.Time) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			header := r.Header.Get("Authorization")
			if header == "" {
				http.Error(w, "missing api key", http.StatusUnauthorized)
				return
			}

			switch {
			case strings.HasPrefix(header, "Bearer "):
				handleProjectAPIKey(w, r, next, queries, limiter, now)
			case strings.HasPrefix(header, "ApiKey "):
				handleLegacyServiceAPIKey(w, r, next, queries, limiter)
			default:
				http.Error(w, "missing api key", http.StatusUnauthorized)
			}
		})
	}
}

func handleLegacyServiceAPIKey(w http.ResponseWriter, r *http.Request, next http.Handler, queries authQueries, limiter requestLimiter) {
	apiKey := strings.TrimSpace(strings.TrimPrefix(r.Header.Get("Authorization"), "ApiKey "))
	svc, err := queries.GetServiceByAPIKey(r.Context(), HashAPIKey(apiKey))
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

	ctx := context.WithValue(r.Context(), ServiceContextKey, &svc)
	next.ServeHTTP(w, r.WithContext(ctx))
}

func handleProjectAPIKey(w http.ResponseWriter, r *http.Request, next http.Handler, queries authQueries, limiter requestLimiter, now func() time.Time) {
	apiKey := strings.TrimSpace(strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer "))
	keyPrefix, err := APIKeyPrefix(apiKey)
	if err != nil {
		http.Error(w, "invalid project api key", http.StatusUnauthorized)
		return
	}

	keyRecord, err := queries.GetAPIKeyByPrefix(r.Context(), keyPrefix)
	if err != nil {
		http.Error(w, "invalid project api key", http.StatusUnauthorized)
		return
	}
	if err := CompareAPIKeyHash(apiKey, keyRecord.KeyHash); err != nil {
		http.Error(w, "invalid project api key", http.StatusUnauthorized)
		return
	}
	if !isUsableAPIKeyStatus(keyRecord.Status) {
		http.Error(w, "inactive project api key", http.StatusUnauthorized)
		return
	}
	if keyRecord.ExpiresAt.Valid && !keyRecord.ExpiresAt.Time.After(now()) {
		http.Error(w, "expired project api key", http.StatusUnauthorized)
		return
	}

	scopes, err := decodeScopes(keyRecord.Scopes)
	if err != nil {
		logger.Get().Error().Err(err).Msg("failed to decode api key scopes")
		http.Error(w, "invalid api key scopes", http.StatusInternalServerError)
		return
	}
	if !hasScope(scopes, "notifications:write") {
		http.Error(w, "insufficient api key scope", http.StatusForbidden)
		return
	}

	ok, err := limiter.Allow(r.Context(), keyRecord.ID.String())
	if err != nil {
		logger.Get().Error().Err(err).Msg("rate limiter error")
		http.Error(w, "rate limiter unavailable", http.StatusInternalServerError)
		return
	}
	if !ok {
		http.Error(w, "rate limit exceeded", http.StatusTooManyRequests)
		return
	}

	nowTs := pgtype.Timestamptz{Time: now(), Valid: true}
	if err := queries.TouchAPIKeyLastUsed(r.Context(), db.TouchAPIKeyLastUsedParams{
		LastUsedAt: nowTs,
		UpdatedAt:  nowTs,
		ID:         keyRecord.ID,
	}); err != nil {
		logger.Get().Error().Err(err).Msg("failed to update api key last_used_at")
		http.Error(w, "failed to update api key activity", http.StatusInternalServerError)
		return
	}

	ctx := context.WithValue(r.Context(), ProjectContextKey, &AuthenticatedProject{
		ProjectID: keyRecord.ProjectID,
		APIKeyID:  keyRecord.ID,
		APIKey:    keyRecord.Name,
		Scopes:    scopes,
		Status:    keyRecord.Status,
	})
	next.ServeHTTP(w, r.WithContext(ctx))
}

func GetService(ctx context.Context) *db.Service {
	if svc, ok := ctx.Value(ServiceContextKey).(*db.Service); ok {
		return svc
	}
	return nil
}

func GetAuthenticatedProject(ctx context.Context) *AuthenticatedProject {
	if project, ok := ctx.Value(ProjectContextKey).(*AuthenticatedProject); ok {
		return project
	}
	return nil
}

func isUsableAPIKeyStatus(status string) bool {
	switch status {
	case "active", "rotating":
		return true
	default:
		return false
	}
}

func decodeScopes(raw []byte) ([]string, error) {
	if len(raw) == 0 {
		return nil, nil
	}

	var scopes []string
	if err := json.Unmarshal(raw, &scopes); err != nil {
		return nil, err
	}
	return scopes, nil
}

func hasScope(scopes []string, required string) bool {
	for _, scope := range scopes {
		if scope == required {
			return true
		}
	}
	return false
}

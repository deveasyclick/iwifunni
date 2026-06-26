package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/deveasyclick/iwifunni/internal/db/gen"
	"github.com/deveasyclick/iwifunni/internal/shared/authctx"
	apikeyutil "github.com/deveasyclick/iwifunni/internal/utils/apikey"
	"github.com/deveasyclick/iwifunni/pkg/logger"
	"github.com/jackc/pgx/v5/pgtype"
)

type authQueries interface {
	GetAPIKeyByPrefix(context.Context, string) (db.ApiKey, error)
	TouchAPIKeyLastUsed(context.Context, db.TouchAPIKeyLastUsedParams) error
}

type requestLimiter interface {
	Allow(context.Context, string) (bool, error)
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

			if !strings.HasPrefix(header, "Bearer ") {
				http.Error(w, "invalid authorization header", http.StatusUnauthorized)
				return
			}
			handleEnvironmentAPIKey(w, r, next, queries, limiter, now)
		})
	}
}

func handleEnvironmentAPIKey(w http.ResponseWriter, r *http.Request, next http.Handler, queries authQueries, limiter requestLimiter, now func() time.Time) {
	apiKey := strings.TrimSpace(strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer "))
	keyPrefix, err := apikeyutil.APIKeyPrefix(apiKey)
	if err != nil {
		http.Error(w, "invalid environment api key", http.StatusUnauthorized)
		return
	}

	keyRecord, err := queries.GetAPIKeyByPrefix(r.Context(), keyPrefix)
	if err != nil {
		http.Error(w, "invalid environment api key", http.StatusUnauthorized)
		return
	}
	if err := apikeyutil.CompareAPIKeyHash(apiKey, keyRecord.KeyHash); err != nil {
		http.Error(w, "invalid environment api key", http.StatusUnauthorized)
		return
	}
	if !isUsableAPIKeyStatus(keyRecord.Status) {
		http.Error(w, "inactive environment api key", http.StatusUnauthorized)
		return
	}
	if keyRecord.ExpiresAt.Valid && !keyRecord.ExpiresAt.Time.After(now()) {
		http.Error(w, "expired environment api key", http.StatusUnauthorized)
		return
	}

	scopes, err := decodeScopes(keyRecord.Scopes)
	if err != nil {
		logger.Get().Error("failed to decode api key scopes", "error", err)
		http.Error(w, "invalid api key scopes", http.StatusInternalServerError)
		return
	}
	if !hasScope(scopes, "notifications:write") {
		http.Error(w, "insufficient api key scope", http.StatusForbidden)
		return
	}

	ok, err := limiter.Allow(r.Context(), keyRecord.ID.String())
	if err != nil {
		logger.Get().Error("rate limiter error", "error", err)
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
		logger.Get().Error("failed to update api key last_used_at", "error", err)
		http.Error(w, "failed to update api key activity", http.StatusInternalServerError)
		return
	}

	ctx := context.WithValue(r.Context(), authctx.ProjectContextKey, &authctx.AuthenticatedEnvironment{
		EnvironmentID: keyRecord.EnvironmentID,
		APIKeyID:      keyRecord.ID,
		APIKey:        keyRecord.Name,
		Scopes:        scopes,
		Status:        keyRecord.Status,
	})
	next.ServeHTTP(w, r.WithContext(ctx))
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

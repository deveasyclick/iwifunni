package auth

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/deveasyclick/iwifunni/internal/db"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

type fakeAuthQueries struct {
	apiKey               db.ApiKey
	apiKeyErr            error
	service              db.Service
	serviceErr           error
	touchedLastUsed      *db.TouchAPIKeyLastUsedParams
	getAPIKeyByPrefixArg string
	getServiceByAPIKey   string
}

func (f *fakeAuthQueries) GetAPIKeyByPrefix(_ context.Context, prefix string) (db.ApiKey, error) {
	f.getAPIKeyByPrefixArg = prefix
	return f.apiKey, f.apiKeyErr
}

func (f *fakeAuthQueries) TouchAPIKeyLastUsed(_ context.Context, arg db.TouchAPIKeyLastUsedParams) error {
	f.touchedLastUsed = &arg
	return nil
}

func (f *fakeAuthQueries) GetServiceByAPIKey(_ context.Context, apiKey string) (db.Service, error) {
	f.getServiceByAPIKey = apiKey
	return f.service, f.serviceErr
}

type fakeLimiter struct {
	allowed bool
	err     error
	key     string
}

func (f *fakeLimiter) Allow(_ context.Context, key string) (bool, error) {
	f.key = key
	return f.allowed, f.err
}

func TestAuthMiddlewareAuthenticatesProjectAPIKey(t *testing.T) {
	t.Parallel()

	rawKey, err := GenerateProjectAPIKey("live")
	if err != nil {
		t.Fatalf("GenerateProjectAPIKey() error = %v", err)
	}
	prefix, err := APIKeyPrefix(rawKey)
	if err != nil {
		t.Fatalf("APIKeyPrefix() error = %v", err)
	}
	hash, err := HashAPIKeySecret(rawKey)
	if err != nil {
		t.Fatalf("HashAPIKeySecret() error = %v", err)
	}
	scopes, err := json.Marshal([]string{"notifications:write"})
	if err != nil {
		t.Fatalf("json.Marshal() error = %v", err)
	}

	queries := &fakeAuthQueries{apiKey: db.ApiKey{
		ID:        uuid.New(),
		ProjectID: uuid.New(),
		Name:      "Primary",
		KeyPrefix: prefix,
		KeyHash:   hash,
		Scopes:    scopes,
		Status:    "active",
	}}
	limiter := &fakeLimiter{allowed: true}
	middleware := newAuthMiddleware(queries, limiter, func() time.Time {
		return time.Date(2026, time.April, 26, 12, 0, 0, 0, time.UTC)
	})

	handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		project := GetAuthenticatedProject(r.Context())
		if project == nil {
			t.Fatal("GetAuthenticatedProject() returned nil")
		}
		if project.ProjectID != queries.apiKey.ProjectID {
			t.Fatalf("ProjectID = %s, want %s", project.ProjectID, queries.apiKey.ProjectID)
		}
		w.WriteHeader(http.StatusNoContent)
	}))

	req := httptest.NewRequest(http.MethodPost, "/notifications", nil)
	req.Header.Set("Authorization", "Bearer "+rawKey)
	res := httptest.NewRecorder()

	handler.ServeHTTP(res, req)

	if res.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want %d", res.Code, http.StatusNoContent)
	}
	if limiter.key != queries.apiKey.ID.String() {
		t.Fatalf("rate limiter key = %q, want %q", limiter.key, queries.apiKey.ID.String())
	}
	if queries.touchedLastUsed == nil {
		t.Fatal("TouchAPIKeyLastUsed() was not called")
	}
}

func TestAuthMiddlewareRejectsProjectAPIKeyWithoutScope(t *testing.T) {
	t.Parallel()

	rawKey, err := GenerateProjectAPIKey("live")
	if err != nil {
		t.Fatalf("GenerateProjectAPIKey() error = %v", err)
	}
	prefix, err := APIKeyPrefix(rawKey)
	if err != nil {
		t.Fatalf("APIKeyPrefix() error = %v", err)
	}
	hash, err := HashAPIKeySecret(rawKey)
	if err != nil {
		t.Fatalf("HashAPIKeySecret() error = %v", err)
	}
	scopes, err := json.Marshal([]string{"templates:read"})
	if err != nil {
		t.Fatalf("json.Marshal() error = %v", err)
	}

	queries := &fakeAuthQueries{apiKey: db.ApiKey{
		ID:        uuid.New(),
		ProjectID: uuid.New(),
		Name:      "Primary",
		KeyPrefix: prefix,
		KeyHash:   hash,
		Scopes:    scopes,
		Status:    "active",
	}}
	limiter := &fakeLimiter{allowed: true}
	middleware := newAuthMiddleware(queries, limiter, func() time.Time { return time.Now().UTC() })

	handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))

	req := httptest.NewRequest(http.MethodPost, "/notifications", nil)
	req.Header.Set("Authorization", "Bearer "+rawKey)
	res := httptest.NewRecorder()

	handler.ServeHTTP(res, req)

	if res.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want %d", res.Code, http.StatusForbidden)
	}
}

func TestAuthMiddlewareAuthenticatesLegacyServiceKey(t *testing.T) {
	t.Parallel()

	rawKey := "legacy-service-key"
	serviceID := uuid.New()
	queries := &fakeAuthQueries{service: db.Service{ID: serviceID, Name: "legacy-service"}}
	limiter := &fakeLimiter{allowed: true}
	middleware := newAuthMiddleware(queries, limiter, func() time.Time { return time.Now().UTC() })

	handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		service := GetService(r.Context())
		if service == nil {
			t.Fatal("GetService() returned nil")
		}
		if service.ID != serviceID {
			t.Fatalf("ServiceID = %s, want %s", service.ID, serviceID)
		}
		w.WriteHeader(http.StatusNoContent)
	}))

	req := httptest.NewRequest(http.MethodPost, "/notifications", nil)
	req.Header.Set("Authorization", "ApiKey "+rawKey)
	res := httptest.NewRecorder()

	handler.ServeHTTP(res, req)

	if res.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want %d", res.Code, http.StatusNoContent)
	}
	if queries.getServiceByAPIKey != HashAPIKey(rawKey) {
		t.Fatalf("GetServiceByAPIKey arg = %q, want %q", queries.getServiceByAPIKey, HashAPIKey(rawKey))
	}
	if limiter.key != serviceID.String() {
		t.Fatalf("rate limiter key = %q, want %q", limiter.key, serviceID.String())
	}
}

func TestAuthMiddlewareRejectsExpiredProjectAPIKey(t *testing.T) {
	t.Parallel()

	rawKey, err := GenerateProjectAPIKey("live")
	if err != nil {
		t.Fatalf("GenerateProjectAPIKey() error = %v", err)
	}
	prefix, err := APIKeyPrefix(rawKey)
	if err != nil {
		t.Fatalf("APIKeyPrefix() error = %v", err)
	}
	hash, err := HashAPIKeySecret(rawKey)
	if err != nil {
		t.Fatalf("HashAPIKeySecret() error = %v", err)
	}
	scopes, err := json.Marshal([]string{"notifications:write"})
	if err != nil {
		t.Fatalf("json.Marshal() error = %v", err)
	}

	queries := &fakeAuthQueries{apiKey: db.ApiKey{
		ID:        uuid.New(),
		ProjectID: uuid.New(),
		Name:      "Primary",
		KeyPrefix: prefix,
		KeyHash:   hash,
		Scopes:    scopes,
		Status:    "active",
		ExpiresAt: pgtype.Timestamptz{Time: time.Date(2026, time.April, 25, 12, 0, 0, 0, time.UTC), Valid: true},
	}}
	limiter := &fakeLimiter{allowed: true}
	middleware := newAuthMiddleware(queries, limiter, func() time.Time {
		return time.Date(2026, time.April, 26, 12, 0, 0, 0, time.UTC)
	})

	handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))

	req := httptest.NewRequest(http.MethodPost, "/notifications", nil)
	req.Header.Set("Authorization", "Bearer "+rawKey)
	res := httptest.NewRecorder()

	handler.ServeHTTP(res, req)

	if res.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want %d", res.Code, http.StatusUnauthorized)
	}
}

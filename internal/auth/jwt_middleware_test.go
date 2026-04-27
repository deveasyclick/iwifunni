package auth

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestJWTMiddlewareInjectsClaims(t *testing.T) {
	t.Parallel()

	manager := NewJWTManager("test-secret", "iwifunni-test", 15*time.Minute)
	manager.now = func() time.Time {
		return time.Date(2026, time.April, 26, 12, 0, 0, 0, time.UTC)
	}

	token, err := manager.GenerateAccessToken("user-123", "project-456", "owner")
	if err != nil {
		t.Fatalf("GenerateAccessToken() error = %v", err)
	}

	middleware := NewJWTMiddleware(manager)
	handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims := GetJWTClaims(r.Context())
		if claims == nil {
			t.Fatal("GetJWTClaims() returned nil")
		}
		if claims.ProjectID != "project-456" {
			t.Fatalf("ProjectID = %q, want %q", claims.ProjectID, "project-456")
		}
		w.WriteHeader(http.StatusNoContent)
	}))

	req := httptest.NewRequest(http.MethodGet, "/projects/current", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	res := httptest.NewRecorder()

	handler.ServeHTTP(res, req)

	if res.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want %d", res.Code, http.StatusNoContent)
	}
}

func TestJWTMiddlewareRejectsMissingBearerToken(t *testing.T) {
	t.Parallel()

	manager := NewJWTManager("test-secret", "iwifunni-test", 15*time.Minute)
	middleware := NewJWTMiddleware(manager)
	handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))

	req := httptest.NewRequest(http.MethodGet, "/projects/current", nil)
	res := httptest.NewRecorder()

	handler.ServeHTTP(res, req)

	if res.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want %d", res.Code, http.StatusUnauthorized)
	}
}

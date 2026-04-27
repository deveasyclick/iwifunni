package auth

import (
	"testing"
	"time"
)

func TestJWTManagerGenerateAndParseAccessToken(t *testing.T) {
	t.Parallel()

	manager := NewJWTManager("test-secret", "iwifunni-test", 15*time.Minute)
	manager.now = func() time.Time {
		return time.Date(2026, time.April, 26, 12, 0, 0, 0, time.UTC)
	}

	token, err := manager.GenerateAccessToken("user-123", "project-456", "owner")
	if err != nil {
		t.Fatalf("GenerateAccessToken() error = %v", err)
	}

	claims, err := manager.ParseAccessToken(token)
	if err != nil {
		t.Fatalf("ParseAccessToken() error = %v", err)
	}

	if claims.UserID != "user-123" {
		t.Fatalf("UserID = %q, want %q", claims.UserID, "user-123")
	}
	if claims.ProjectID != "project-456" {
		t.Fatalf("ProjectID = %q, want %q", claims.ProjectID, "project-456")
	}
	if claims.Role != "owner" {
		t.Fatalf("Role = %q, want %q", claims.Role, "owner")
	}
	if claims.Issuer != "iwifunni-test" {
		t.Fatalf("Issuer = %q, want %q", claims.Issuer, "iwifunni-test")
	}
}

func TestJWTManagerRejectsMissingClaims(t *testing.T) {
	t.Parallel()

	manager := NewJWTManager("test-secret", "iwifunni-test", 15*time.Minute)

	if _, err := manager.GenerateAccessToken("", "project-456", "owner"); err != ErrInvalidJWTClaims {
		t.Fatalf("GenerateAccessToken() error = %v, want %v", err, ErrInvalidJWTClaims)
	}
}

func TestHashPasswordRoundTrip(t *testing.T) {
	t.Parallel()

	hash, err := HashPassword("correct-horse-battery-staple")
	if err != nil {
		t.Fatalf("HashPassword() error = %v", err)
	}
	if hash == "correct-horse-battery-staple" {
		t.Fatal("HashPassword() returned plaintext password")
	}

	if err := ComparePasswordHash("correct-horse-battery-staple", hash); err != nil {
		t.Fatalf("ComparePasswordHash() error = %v", err)
	}
	if err := ComparePasswordHash("wrong-password", hash); err == nil {
		t.Fatal("ComparePasswordHash() expected error for wrong password")
	}
}

func TestGenerateRefreshToken(t *testing.T) {
	t.Parallel()

	rawToken, hashedToken, err := GenerateRefreshToken()
	if err != nil {
		t.Fatalf("GenerateRefreshToken() error = %v", err)
	}
	if rawToken == "" {
		t.Fatal("GenerateRefreshToken() returned empty raw token")
	}
	if hashedToken == "" {
		t.Fatal("GenerateRefreshToken() returned empty hash")
	}
	if hashedToken != HashRefreshToken(rawToken) {
		t.Fatal("HashRefreshToken() mismatch")
	}
}

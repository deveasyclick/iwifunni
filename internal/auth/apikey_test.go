package auth

import (
	"strings"
	"testing"
)

func TestGenerateProjectAPIKey(t *testing.T) {
	t.Parallel()

	apiKey, err := GenerateProjectAPIKey("live")
	if err != nil {
		t.Fatalf("GenerateProjectAPIKey() error = %v", err)
	}
	if !strings.HasPrefix(apiKey, apiKeyPrefix) {
		t.Fatalf("api key = %q, want prefix %q", apiKey, apiKeyPrefix)
	}

	prefix, err := APIKeyPrefix(apiKey)
	if err != nil {
		t.Fatalf("APIKeyPrefix() error = %v", err)
	}
	if prefix != apiKey[:apiKeyLookupPrefixLength] {
		t.Fatalf("prefix = %q, want %q", prefix, apiKey[:apiKeyLookupPrefixLength])
	}
}

func TestAPIKeyPrefixRejectsInvalidFormat(t *testing.T) {
	t.Parallel()

	if _, err := APIKeyPrefix("iwf_legacy_key"); err != ErrInvalidAPIKeyFormat {
		t.Fatalf("APIKeyPrefix() error = %v, want %v", err, ErrInvalidAPIKeyFormat)
	}
}

func TestAPIKeyHashRoundTrip(t *testing.T) {
	t.Parallel()

	apiKey := "nk_live_example_secret_value"
	hash, err := HashAPIKeySecret(apiKey)
	if err != nil {
		t.Fatalf("HashAPIKeySecret() error = %v", err)
	}
	if hash == apiKey {
		t.Fatal("HashAPIKeySecret() returned plaintext")
	}

	if err := CompareAPIKeyHash(apiKey, hash); err != nil {
		t.Fatalf("CompareAPIKeyHash() error = %v", err)
	}
	if err := CompareAPIKeyHash("nk_live_wrong_secret", hash); err == nil {
		t.Fatal("CompareAPIKeyHash() expected error for wrong key")
	}
}

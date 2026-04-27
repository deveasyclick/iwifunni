package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

const (
	apiKeyPrefix             = "nk_live_"
	apiKeyLookupPrefixLength = 16
)

var ErrInvalidAPIKeyFormat = errors.New("invalid api key format")

func GenerateAPIKey() (string, error) {
	return GenerateProjectAPIKey("live")
}

func GenerateProjectAPIKey(environment string) (string, error) {
	prefix := "nk_" + environment + "_"
	if environment == "" {
		return "", fmt.Errorf("environment is required")
	}

	randomBytes := make([]byte, 32)
	if _, err := rand.Read(randomBytes); err != nil {
		return "", fmt.Errorf("read random bytes: %w", err)
	}

	return prefix + base64.RawURLEncoding.EncodeToString(randomBytes), nil
}

func HashAPIKey(apiKey string) string {
	sum := sha256.Sum256([]byte(apiKey))
	return hex.EncodeToString(sum[:])
}

func APIKeyPrefix(apiKey string) (string, error) {
	if !strings.HasPrefix(apiKey, "nk_") {
		return "", ErrInvalidAPIKeyFormat
	}
	if len(apiKey) < apiKeyLookupPrefixLength {
		return "", ErrInvalidAPIKeyFormat
	}

	parts := strings.SplitN(apiKey, "_", 3)
	if len(parts) != 3 || parts[1] == "" || parts[2] == "" {
		return "", ErrInvalidAPIKeyFormat
	}

	return apiKey[:apiKeyLookupPrefixLength], nil
}

func HashAPIKeySecret(apiKey string) (string, error) {
	if apiKey == "" {
		return "", fmt.Errorf("api key is required")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(apiKey), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("hash api key: %w", err)
	}

	return string(hash), nil
}

func CompareAPIKeyHash(apiKey, hash string) error {
	if apiKey == "" || hash == "" {
		return fmt.Errorf("api key and hash are required")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(apiKey)); err != nil {
		return fmt.Errorf("compare api key hash: %w", err)
	}

	return nil
}

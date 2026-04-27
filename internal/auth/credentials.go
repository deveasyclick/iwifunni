package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"

	"golang.org/x/crypto/bcrypt"
)

func HashPassword(password string) (string, error) {
	if password == "" {
		return "", fmt.Errorf("password is required")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("hash password: %w", err)
	}

	return string(hash), nil
}

func ComparePasswordHash(password, hash string) error {
	if password == "" || hash == "" {
		return fmt.Errorf("password and hash are required")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)); err != nil {
		return fmt.Errorf("compare password hash: %w", err)
	}

	return nil
}

func GenerateRefreshToken() (string, string, error) {
	randomBytes := make([]byte, 32)
	if _, err := rand.Read(randomBytes); err != nil {
		return "", "", fmt.Errorf("read random bytes: %w", err)
	}

	rawToken := base64.RawURLEncoding.EncodeToString(randomBytes)
	hashedToken := hashToken(rawToken)
	return rawToken, hashedToken, nil
}

func HashRefreshToken(token string) string {
	return hashToken(token)
}

func hashToken(value string) string {
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:])
}

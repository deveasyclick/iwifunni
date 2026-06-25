package jwtutil

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var (
	secret    []byte
	issuer    string
	accessTTL time.Duration
	now       = time.Now
)

// ErrInvalidJWTClaims is returned when token claims are invalid or missing.
var ErrInvalidJWTClaims = errors.New("invalid jwt claims")

// Claims represents the JWT access token claims.
type Claims struct {
	UserID         string `json:"user_id"`
	OrganizationID string `json:"organization_id"`
	Role           string `json:"role"`
	jwt.RegisteredClaims
}

// SetNow overrides the time provider for testing.
func SetNow(fn func() time.Time) {
	now = fn
}

// Init sets the global JWT configuration. Must be called once at startup.
func Init(jwtSecret, jwtIssuer string, accessTokenTTL time.Duration) {
	secret = []byte(jwtSecret)
	issuer = jwtIssuer
	accessTTL = accessTokenTTL
}

// GenerateAccessToken creates a signed JWT for the given user.
func GenerateAccessToken(userID, organizationID, role string) (string, error) {
	if userID == "" || organizationID == "" || role == "" {
		return "", ErrInvalidJWTClaims
	}

	n := now().UTC()
	claims := Claims{
		UserID:         userID,
		OrganizationID: organizationID,
		Role:           role,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    issuer,
			Subject:   userID,
			IssuedAt:  jwt.NewNumericDate(n),
			NotBefore: jwt.NewNumericDate(n),
			ExpiresAt: jwt.NewNumericDate(n.Add(accessTTL)),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(secret)
}

// ParseAccessToken validates and parses a JWT token string.
func ParseAccessToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (any, error) {
		if token.Method == nil || token.Method.Alg() != jwt.SigningMethodHS256.Alg() {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return secret, nil
	}, jwt.WithIssuedAt(), jwt.WithIssuer(issuer), jwt.WithTimeFunc(now))
	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, ErrInvalidJWTClaims
	}
	if claims.UserID == "" || claims.OrganizationID == "" || claims.Role == "" {
		return nil, ErrInvalidJWTClaims
	}

	return claims, nil
}

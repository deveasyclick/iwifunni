package auth

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"github.com/deveasyclick/iwifunni/internal/db"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

const ClaimsContextKey contextKey = "jwt_claims"

type jwtEnvironmentResolver interface {
	GetDefaultEnvironmentByOrganization(context.Context, uuid.UUID) (db.GetDefaultEnvironmentByOrganizationRow, error)
}

func NewJWTMiddleware(manager *JWTManager, resolver ...jwtEnvironmentResolver) func(http.Handler) http.Handler {
	var envResolver jwtEnvironmentResolver
	if len(resolver) > 0 {
		envResolver = resolver[0]
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			header := r.Header.Get("Authorization")
			if header == "" || !strings.HasPrefix(header, "Bearer ") {
				http.Error(w, "missing bearer token", http.StatusUnauthorized)
				return
			}

			token := strings.TrimSpace(strings.TrimPrefix(header, "Bearer "))
			claims, err := manager.ParseAccessToken(token)
			if err != nil {
				http.Error(w, "invalid bearer token", http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), ClaimsContextKey, claims)
			if envResolver != nil {
				ctx, err = attachDefaultEnvironment(ctx, envResolver, claims)
				if err != nil {
					http.Error(w, "failed to resolve default environment", http.StatusInternalServerError)
					return
				}
			}
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func attachDefaultEnvironment(ctx context.Context, resolver jwtEnvironmentResolver, claims *Claims) (context.Context, error) {
	if claims == nil || claims.OrganizationID == "" {
		return ctx, nil
	}
	organizationID, err := uuid.Parse(claims.OrganizationID)
	if err != nil {
		return ctx, nil
	}
	environment, err := resolver.GetDefaultEnvironmentByOrganization(ctx, organizationID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ctx, nil
		}
		return nil, err
	}
	return context.WithValue(ctx, ProjectContextKey, &AuthenticatedEnvironment{EnvironmentID: environment.ID}), nil
}

func GetJWTClaims(ctx context.Context) *Claims {
	claims, ok := ctx.Value(ClaimsContextKey).(*Claims)
	if !ok {
		return nil
	}
	return claims
}

package authctx

import (
	"context"

	jwtutil "github.com/deveasyclick/iwifunni/internal/utils/jwt"
	"github.com/google/uuid"
)

type contextKey string

const (
	// ProjectContextKey is used to store the authenticated environment in the request context.
	ProjectContextKey contextKey = "project_auth"

	// ClaimsContextKey is used to store JWT claims in the request context.
	ClaimsContextKey contextKey = "jwt_claims"
)

// AuthenticatedEnvironment holds the resolved environment for an API key-authenticated request.
type AuthenticatedEnvironment struct {
	EnvironmentID uuid.UUID
	APIKeyID      uuid.UUID
	APIKey        string
	Scopes        []string
	Status        string
}

// AuthenticatedProject is a legacy alias for AuthenticatedEnvironment.
type AuthenticatedProject struct {
	ProjectID uuid.UUID
	APIKeyID  uuid.UUID
	APIKey    string
	Scopes    []string
	Status    string
}

// Claims is a type alias for JWT claims.
type Claims = jwtutil.Claims

// GetJWTClaims extracts JWT claims from the context.
func GetJWTClaims(ctx context.Context) *Claims {
	claims, ok := ctx.Value(ClaimsContextKey).(*Claims)
	if !ok {
		return nil
	}
	return claims
}

// GetAuthenticatedEnvironment extracts the authenticated environment from the context.
func GetAuthenticatedEnvironment(ctx context.Context) *AuthenticatedEnvironment {
	if environment, ok := ctx.Value(ProjectContextKey).(*AuthenticatedEnvironment); ok {
		return environment
	}
	return nil
}

// GetAuthenticatedProject extracts a legacy project view of the authenticated environment.
func GetAuthenticatedProject(ctx context.Context) *AuthenticatedProject {
	if environment := GetAuthenticatedEnvironment(ctx); environment != nil {
		return &AuthenticatedProject{
			ProjectID: environment.EnvironmentID,
			APIKeyID:  environment.APIKeyID,
			APIKey:    environment.APIKey,
			Scopes:    environment.Scopes,
			Status:    environment.Status,
		}
	}
	return nil
}

// GetOrganizationID extracts the organization ID from JWT claims in the context.
func GetOrganizationID(ctx context.Context) (uuid.UUID, bool) {
	if claims := GetJWTClaims(ctx); claims != nil {
		id, err := uuid.Parse(claims.OrganizationID)
		if err == nil {
			return id, true
		}
	}
	return uuid.Nil, false
}

// GetEnvironmentID extracts the environment ID from the context.
func GetEnvironmentID(ctx context.Context) (uuid.UUID, bool) {
	if environment := GetAuthenticatedEnvironment(ctx); environment != nil {
		return environment.EnvironmentID, true
	}
	return uuid.Nil, false
}

// GetProjectID extracts the project/environment ID from the context.
func GetProjectID(ctx context.Context) (uuid.UUID, bool) {
	if environmentID, ok := GetEnvironmentID(ctx); ok {
		return environmentID, true
	}
	if project := GetAuthenticatedProject(ctx); project != nil {
		return project.ProjectID, true
	}
	return uuid.Nil, false
}

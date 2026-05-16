package auth

import (
	"context"

	"github.com/google/uuid"
)

func GetOrganizationID(ctx context.Context) (uuid.UUID, bool) {
	if claims := GetJWTClaims(ctx); claims != nil {
		id, err := uuid.Parse(claims.OrganizationID)
		if err == nil {
			return id, true
		}
	}

	return uuid.Nil, false
}

func GetEnvironmentID(ctx context.Context) (uuid.UUID, bool) {
	if environment := GetAuthenticatedEnvironment(ctx); environment != nil {
		return environment.EnvironmentID, true
	}

	return uuid.Nil, false
}

func GetProjectID(ctx context.Context) (uuid.UUID, bool) {
	if environmentID, ok := GetEnvironmentID(ctx); ok {
		return environmentID, true
	}

	if project := GetAuthenticatedProject(ctx); project != nil {
		return project.ProjectID, true
	}

	return uuid.Nil, false
}
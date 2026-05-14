package auth

import (
	"context"

	"github.com/google/uuid"
)

func GetProjectID(ctx context.Context) (uuid.UUID, bool) {
	if claims := GetJWTClaims(ctx); claims != nil {
		id, err := uuid.Parse(claims.ProjectID)
		if err == nil {
			return id, true
		}
	}

	if project := GetAuthenticatedProject(ctx); project != nil {
		return project.ProjectID, true
	}

	return uuid.Nil, false
}
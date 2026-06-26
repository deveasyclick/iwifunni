package auth

import (
	"context"
	"errors"
	"strings"

	"github.com/deveasyclick/iwifunni/internal/db/gen"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

func (s *Service) ensurePrimaryTenant(ctx context.Context, userID uuid.UUID, nowTs pgtype.Timestamptz) (db.OrganizationMember, db.Environment, error) {
	membership, err := s.tenants.GetFirstOrganizationMembershipByUser(ctx, userID)
	if err == nil {
		defaultEnvironment, envErr := s.tenants.GetDefaultEnvironmentByOrganization(ctx, membership.OrganizationID)
		if envErr == nil {
			return membership, environmentFromDefaultRow(defaultEnvironment), nil
		}
		if !errors.Is(envErr, pgx.ErrNoRows) {
			return db.OrganizationMember{}, db.Environment{}, envErr
		}

		development, _, createErr := s.createSeedEnvironments(ctx, membership.OrganizationID, nowTs)
		if createErr != nil {
			return db.OrganizationMember{}, db.Environment{}, createErr
		}
		return membership, development, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return db.OrganizationMember{}, db.Environment{}, err
	}

	organization, createErr := s.tenants.CreateOrganization(ctx, db.CreateOrganizationParams{
		ID:        uuid.New(),
		Name:      defaultPlaceholderOrganization,
		CreatedAt: nowTs,
		UpdatedAt: nowTs,
	})
	if createErr != nil {
		return db.OrganizationMember{}, db.Environment{}, createErr
	}

	membership = db.OrganizationMember{
		ID:             uuid.New(),
		OrganizationID: organization.ID,
		UserID:         userID,
		Role:           "owner",
		CreatedAt:      nowTs,
	}
	if err := s.tenants.CreateOrganizationMember(ctx, db.CreateOrganizationMemberParams{
		ID:             membership.ID,
		OrganizationID: membership.OrganizationID,
		UserID:         membership.UserID,
		Role:           membership.Role,
		CreatedAt:      membership.CreatedAt,
	}); err != nil {
		return db.OrganizationMember{}, db.Environment{}, err
	}

	development, _, err := s.createSeedEnvironments(ctx, organization.ID, nowTs)
	if err != nil {
		return db.OrganizationMember{}, db.Environment{}, err
	}

	return membership, development, nil
}

func (s *Service) createSeedEnvironments(ctx context.Context, organizationID uuid.UUID, nowTs pgtype.Timestamptz) (db.Environment, db.Environment, error) {
	development, err := s.tenants.CreateEnvironment(ctx, db.CreateEnvironmentParams{
		ID:             uuid.New(),
		OrganizationID: organizationID,
		Name:           defaultDevelopmentEnvironment,
		IsDefault:      true,
		CreatedAt:      nowTs,
		UpdatedAt:      nowTs,
	})
	if err != nil {
		return db.Environment{}, db.Environment{}, err
	}

	production, err := s.tenants.CreateEnvironment(ctx, db.CreateEnvironmentParams{
		ID:             uuid.New(),
		OrganizationID: organizationID,
		Name:           defaultProductionEnvironment,
		IsDefault:      false,
		CreatedAt:      nowTs,
		UpdatedAt:      nowTs,
	})
	if err != nil {
		return db.Environment{}, db.Environment{}, err
	}

	return development, production, nil
}

func environmentFromDefaultRow(row db.Environment) db.Environment {
	return db.Environment{
		ID:             row.ID,
		OrganizationID: row.OrganizationID,
		Name:           row.Name,
		IsDefault:      row.IsDefault,
		CreatedAt:      row.CreatedAt,
		UpdatedAt:      row.UpdatedAt,
	}
}

func isSupportedSocialProvider(provider string) bool {
	switch provider {
	case "google", "github":
		return true
	default:
		return false
	}
}

func normalizeSocialNames(firstName, lastName, fullName, email string) (string, string) {
	firstName = strings.TrimSpace(firstName)
	lastName = strings.TrimSpace(lastName)
	fullName = strings.TrimSpace(fullName)

	if firstName != "" && lastName != "" {
		return firstName, lastName
	}

	if fullName != "" {
		parts := strings.Fields(fullName)
		if firstName == "" && len(parts) > 0 {
			firstName = parts[0]
		}
		if lastName == "" && len(parts) > 1 {
			lastName = strings.Join(parts[1:], " ")
		}
	}

	if firstName == "" && email != "" {
		firstName = strings.Split(email, "@")[0]
	}
	if lastName == "" {
		lastName = "User"
	}

	return firstName, lastName
}

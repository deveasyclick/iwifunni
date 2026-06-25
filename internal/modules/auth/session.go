package auth

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/deveasyclick/iwifunni/internal/db"
	jwtutil "github.com/deveasyclick/iwifunni/internal/utils/jwt"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

func (s *Service) CompleteOnboarding(ctx context.Context, input CompleteOnboardingInput) (*CompleteOnboardingResult, error) {
	organizationName := strings.TrimSpace(input.OrganizationName)
	if input.UserID == uuid.Nil {
		return nil, fmt.Errorf("user id is required")
	}
	if organizationName == "" {
		return nil, fmt.Errorf("organization name is required")
	}

	membership, err := s.tenants.GetFirstOrganizationMembershipByUser(ctx, input.UserID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrOrganizationMembershipNotFound
		}
		return nil, err
	}

	nowTs := pgtype.Timestamptz{Time: s.now().UTC(), Valid: true}
	if err := s.tenants.UpdateOrganizationName(ctx, db.UpdateOrganizationNameParams{
		ID:        membership.OrganizationID,
		Name:      organizationName,
		UpdatedAt: nowTs,
	}); err != nil {
		return nil, err
	}
	if err := s.users.UpdateUserOnboardingCompletedAt(ctx, db.UpdateUserOnboardingCompletedAtParams{
		ID:                    input.UserID,
		OnboardingCompletedAt: nowTs,
		UpdatedAt:             nowTs,
	}); err != nil {
		return nil, err
	}

	defaultEnvironment, err := s.tenants.GetDefaultEnvironmentByOrganization(ctx, membership.OrganizationID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrDefaultEnvironmentNotFound
		}
		return nil, err
	}

	return &CompleteOnboardingResult{
		OrganizationID:   membership.OrganizationID,
		OrganizationName: organizationName,
		EnvironmentID:    defaultEnvironment.ID,
		NeedsOnboarding:  false,
	}, nil
}

func (s *Service) Refresh(ctx context.Context, input RefreshInput) (*RefreshResult, error) {
	rawRefreshToken := strings.TrimSpace(input.RefreshToken)
	if rawRefreshToken == "" {
		return nil, fmt.Errorf("refresh token is required")
	}

	storedToken, err := s.sessions.GetRefreshTokenByHash(ctx, HashRefreshToken(rawRefreshToken))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrInvalidCredentials
		}
		return nil, err
	}
	if !storedToken.ExpiresAt.Valid || storedToken.ExpiresAt.Time.Before(s.now().UTC()) {
		return nil, ErrInvalidCredentials
	}

	user, err := s.users.GetUserByID(ctx, storedToken.UserID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrInvalidCredentials
		}
		return nil, err
	}
	if !user.EmailVerifiedAt.Valid {
		return nil, ErrInvalidCredentials
	}

	if err := s.sessions.DeleteRefreshTokenByHash(ctx, storedToken.TokenHash); err != nil {
		return nil, err
	}

	nowTs := pgtype.Timestamptz{Time: s.now().UTC(), Valid: true}
	membership, environment, err := s.ensurePrimaryTenant(ctx, storedToken.UserID, nowTs)
	if err != nil {
		return nil, err
	}

	return s.newAuthResult(ctx, storedToken.UserID, membership.OrganizationID, environment.ID, membership.Role, !user.OnboardingCompletedAt.Valid, nowTs)
}

func (s *Service) Logout(ctx context.Context, input LogoutInput) error {
	rawRefreshToken := strings.TrimSpace(input.RefreshToken)
	if rawRefreshToken == "" {
		return fmt.Errorf("refresh token is required")
	}

	return s.sessions.DeleteRefreshTokenByHash(ctx, HashRefreshToken(rawRefreshToken))
}

func (s *Service) issueSession(ctx context.Context, userID, organizationID uuid.UUID, role string, nowTs pgtype.Timestamptz) (string, string, error) {
	accessToken, err := jwtutil.GenerateAccessToken(userID.String(), organizationID.String(), role)
	if err != nil {
		return "", "", err
	}
	rawRefreshToken, hashedRefreshToken, err := GenerateRefreshToken()
	if err != nil {
		return "", "", err
	}
	if err := s.sessions.CreateRefreshToken(ctx, db.CreateRefreshTokenParams{
		ID:        uuid.New(),
		UserID:    userID,
		TokenHash: hashedRefreshToken,
		ExpiresAt: pgtype.Timestamptz{Time: nowTs.Time.Add(s.refreshTTL), Valid: true},
		CreatedAt: nowTs,
		UpdatedAt: nowTs,
	}); err != nil {
		return "", "", err
	}

	return accessToken, rawRefreshToken, nil
}

func (s *Service) newAuthResult(ctx context.Context, userID, organizationID, environmentID uuid.UUID, role string, needsOnboarding bool, nowTs pgtype.Timestamptz) (*AuthResult, error) {
	accessToken, refreshToken, err := s.issueSession(ctx, userID, organizationID, role, nowTs)
	if err != nil {
		return nil, err
	}

	return &AuthResult{
		UserID:          userID,
		OrganizationID:  organizationID,
		EnvironmentID:   environmentID,
		Role:            role,
		AccessToken:     accessToken,
		RefreshToken:    refreshToken,
		NeedsOnboarding: needsOnboarding,
	}, nil
}

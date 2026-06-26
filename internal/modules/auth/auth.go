package auth

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/deveasyclick/iwifunni/internal/db/gen"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

func (s *Service) Signup(ctx context.Context, input SignupInput) (*SignupResult, error) {
	firstName := strings.TrimSpace(input.FirstName)
	lastName := strings.TrimSpace(input.LastName)
	email := strings.ToLower(strings.TrimSpace(input.Email))
	password := strings.TrimSpace(input.Password)

	if _, err := s.users.GetUserByEmail(ctx, email); err == nil {
		return nil, ErrEmailAlreadyExists
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}

	nowTs := pgtype.Timestamptz{Time: s.now().UTC(), Valid: true}
	userID := uuid.New()

	passwordHash, err := HashPassword(password)
	if err != nil {
		return nil, err
	}
	if err := s.users.CreateUser(ctx, db.CreateUserParams{
		ID:                    userID,
		Email:                 email,
		PasswordHash:          passwordHash,
		FirstName:             firstName,
		LastName:              lastName,
		EmailVerifiedAt:       pgtype.Timestamptz{},
		OnboardingCompletedAt: pgtype.Timestamptz{},
		CreatedAt:             nowTs,
		UpdatedAt:             nowTs,
	}); err != nil {
		return nil, err
	}

	membership, environment, err := s.ensurePrimaryTenant(ctx, userID, nowTs)
	if err != nil {
		return nil, err
	}

	verificationExpiresAt, err := s.createAndSendVerification(ctx, userID, email)
	if err != nil {
		return nil, err
	}

	return &SignupResult{
		UserID:                userID,
		OrganizationID:        membership.OrganizationID,
		EnvironmentID:         environment.ID,
		Email:                 email,
		Role:                  membership.Role,
		VerificationRequired:  true,
		VerificationExpiresAt: verificationExpiresAt,
		NeedsOnboarding:       true,
	}, nil
}

func (s *Service) SigninWithSocial(ctx context.Context, input SocialSigninInput) (*SocialSigninResult, error) {
	provider := strings.ToLower(strings.TrimSpace(input.Provider))
	providerUserID := strings.TrimSpace(input.ProviderUserID)
	email := strings.ToLower(strings.TrimSpace(input.Email))
	if !isSupportedSocialProvider(provider) {
		return nil, ErrUnsupportedSocialProvider
	}
	if providerUserID == "" {
		return nil, fmt.Errorf("provider user id is required")
	}
	if email == "" {
		return nil, ErrSocialEmailRequired
	}

	firstName, lastName := normalizeSocialNames(input.FirstName, input.LastName, input.FullName, email)
	nowTs := pgtype.Timestamptz{Time: s.now().UTC(), Valid: true}

	identity, err := s.identities.GetAuthIdentityByProviderUserID(ctx, db.GetAuthIdentityByProviderUserIDParams{
		Provider:       provider,
		ProviderUserID: providerUserID,
	})
	if err == nil {
		user, userErr := s.users.GetUserByID(ctx, identity.UserID)
		if userErr != nil {
			return nil, userErr
		}
		if !user.EmailVerifiedAt.Valid {
			if err := s.users.UpdateUserEmailVerifiedAt(ctx, db.UpdateUserEmailVerifiedAtParams{
				ID:              user.ID,
				EmailVerifiedAt: nowTs,
				UpdatedAt:       nowTs,
			}); err != nil {
				return nil, err
			}
		}
		membership, environment, membershipErr := s.ensurePrimaryTenant(ctx, identity.UserID, nowTs)
		if membershipErr != nil {
			return nil, membershipErr
		}
		return s.newAuthResult(ctx, identity.UserID, membership.OrganizationID, environment.ID, membership.Role, !user.OnboardingCompletedAt.Valid, nowTs)
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}

	user, err := s.users.GetUserByEmail(ctx, email)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}

	userID := uuid.Nil
	needsOnboarding := true
	if errors.Is(err, pgx.ErrNoRows) {
		userID = uuid.New()
		if err := s.users.CreateUser(ctx, db.CreateUserParams{
			ID:                    userID,
			Email:                 email,
			PasswordHash:          "",
			FirstName:             firstName,
			LastName:              lastName,
			EmailVerifiedAt:       nowTs,
			OnboardingCompletedAt: pgtype.Timestamptz{},
			CreatedAt:             nowTs,
			UpdatedAt:             nowTs,
		}); err != nil {
			return nil, err
		}
	} else {
		userID = user.ID
		needsOnboarding = !user.OnboardingCompletedAt.Valid
		if !user.EmailVerifiedAt.Valid {
			if err := s.users.UpdateUserEmailVerifiedAt(ctx, db.UpdateUserEmailVerifiedAtParams{
				ID:              user.ID,
				EmailVerifiedAt: nowTs,
				UpdatedAt:       nowTs,
			}); err != nil {
				return nil, err
			}
		}
	}

	if err := s.identities.CreateAuthIdentity(ctx, db.CreateAuthIdentityParams{
		ID:             uuid.New(),
		UserID:         userID,
		Provider:       provider,
		ProviderUserID: providerUserID,
		Email:          email,
		CreatedAt:      nowTs,
		UpdatedAt:      nowTs,
	}); err != nil {
		return nil, err
	}

	membership, environment, err := s.ensurePrimaryTenant(ctx, userID, nowTs)
	if err != nil {
		return nil, err
	}

	return s.newAuthResult(ctx, userID, membership.OrganizationID, environment.ID, membership.Role, needsOnboarding, nowTs)
}

func (s *Service) Signin(ctx context.Context, input SigninInput) (*SigninResult, error) {
	email := strings.ToLower(strings.TrimSpace(input.Email))
	password := strings.TrimSpace(input.Password)

	user, err := s.users.GetUserByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrInvalidCredentials
		}
		return nil, err
	}
	if !user.EmailVerifiedAt.Valid {
		return nil, ErrEmailNotVerified
	}
	if err := ComparePasswordHash(password, user.PasswordHash); err != nil {
		return nil, ErrInvalidCredentials
	}

	nowTs := pgtype.Timestamptz{Time: s.now().UTC(), Valid: true}
	membership, environment, err := s.ensurePrimaryTenant(ctx, user.ID, nowTs)
	if err != nil {
		return nil, err
	}

	return s.newAuthResult(ctx, user.ID, membership.OrganizationID, environment.ID, membership.Role, !user.OnboardingCompletedAt.Valid, nowTs)
}

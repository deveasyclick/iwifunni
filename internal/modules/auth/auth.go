package auth

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/deveasyclick/iwifunni/internal/db"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

func (s *Service) Signup(ctx context.Context, input SignupInput) (*SignupResult, error) {
	firstName := strings.TrimSpace(input.FirstName)
	lastName := strings.TrimSpace(input.LastName)
	email := strings.ToLower(strings.TrimSpace(input.Email))
	password := strings.TrimSpace(input.Password)
	if firstName == "" || lastName == "" || email == "" || password == "" {
		return nil, fmt.Errorf("first name, last name, email, and password are required")
	}

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

	verificationCode, verificationHash, err := GenerateVerificationCode()
	if err != nil {
		return nil, err
	}
	verificationExpiresAt := pgtype.Timestamptz{Time: nowTs.Time.Add(s.verificationTTL), Valid: true}
	if err := s.verifications.UpsertEmailVerification(ctx, db.UpsertEmailVerificationParams{
		UserID:     userID,
		CodeHash:   verificationHash,
		ExpiresAt:  verificationExpiresAt,
		ConsumedAt: pgtype.Timestamptz{},
		CreatedAt:  nowTs,
		UpdatedAt:  nowTs,
	}); err != nil {
		return nil, err
	}

	if s.verificationSender != nil {
		_ = s.verificationSender(ctx, email, verificationCode)
	}

	return &SignupResult{
		UserID:                userID,
		OrganizationID:        membership.OrganizationID,
		EnvironmentID:         environment.ID,
		Email:                 email,
		Role:                  membership.Role,
		VerificationRequired:  true,
		VerificationExpiresAt: verificationExpiresAt.Time,
		NeedsOnboarding:       true,
	}, nil
}

func (s *Service) VerifyEmail(ctx context.Context, input VerifyEmailInput) (*VerifyEmailResult, error) {
	email := strings.ToLower(strings.TrimSpace(input.Email))
	code := strings.TrimSpace(input.Code)
	if email == "" || code == "" {
		return nil, fmt.Errorf("email and verification code are required")
	}

	user, err := s.users.GetUserByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrInvalidVerificationCode
		}
		return nil, err
	}

	verification, err := s.verifications.GetEmailVerificationByUserID(ctx, user.ID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrInvalidVerificationCode
		}
		return nil, err
	}
	if verification.ConsumedAt.Valid {
		return nil, ErrInvalidVerificationCode
	}
	if !verification.ExpiresAt.Valid || verification.ExpiresAt.Time.Before(s.now().UTC()) {
		return nil, ErrVerificationCodeExpired
	}
	if !CompareVerificationCode(code, verification.CodeHash) {
		return nil, ErrInvalidVerificationCode
	}

	nowTs := pgtype.Timestamptz{Time: s.now().UTC(), Valid: true}
	if err := s.users.UpdateUserEmailVerifiedAt(ctx, db.UpdateUserEmailVerifiedAtParams{
		ID:              user.ID,
		EmailVerifiedAt: nowTs,
		UpdatedAt:       nowTs,
	}); err != nil {
		return nil, err
	}
	if err := s.verifications.DeleteEmailVerificationByUserID(ctx, user.ID); err != nil {
		return nil, err
	}

	membership, environment, err := s.ensurePrimaryTenant(ctx, user.ID, nowTs)
	if err != nil {
		return nil, err
	}

	return s.newAuthResult(ctx, user.ID, membership.OrganizationID, environment.ID, membership.Role, !user.OnboardingCompletedAt.Valid, nowTs)
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
	if email == "" || password == "" {
		return nil, fmt.Errorf("email and password are required")
	}

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

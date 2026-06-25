package auth

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/deveasyclick/iwifunni/internal/db"
	jwtutil "github.com/deveasyclick/iwifunni/internal/utils/jwt"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

var (
	ErrEmailAlreadyExists        = errors.New("email already exists")
	ErrInvalidCredentials        = errors.New("invalid credentials")
	ErrEmailNotVerified          = errors.New("email not verified")
	ErrInvalidVerificationCode   = errors.New("invalid verification code")
	ErrVerificationCodeExpired   = errors.New("verification code expired")
	ErrUnsupportedSocialProvider = errors.New("unsupported social provider")
	ErrSocialEmailRequired       = errors.New("social account email is required")
	ErrOrganizationMembershipNotFound = errors.New("organization membership not found")
	ErrDefaultEnvironmentNotFound     = errors.New("default environment not found")
)

const (
	defaultVerificationTTL        = 15 * time.Minute
	defaultPlaceholderOrganization = "Untitled Organization"
	defaultDevelopmentEnvironment = "development"
	defaultProductionEnvironment  = "production"
)

type VerificationSender func(ctx context.Context, email, code string) error

type ServiceOption func(*Service)

type authUserStore interface {
	CreateUser(context.Context, db.CreateUserParams) error
	GetUserByEmail(context.Context, string) (db.GetUserByEmailRow, error)
	GetUserByID(context.Context, uuid.UUID) (db.GetUserByIDRow, error)
	UpdateUserEmailVerifiedAt(context.Context, db.UpdateUserEmailVerifiedAtParams) error
	UpdateUserOnboardingCompletedAt(context.Context, db.UpdateUserOnboardingCompletedAtParams) error
}

type authVerificationStore interface {
	UpsertEmailVerification(context.Context, db.UpsertEmailVerificationParams) error
	GetEmailVerificationByUserID(context.Context, uuid.UUID) (db.EmailVerification, error)
	DeleteEmailVerificationByUserID(context.Context, uuid.UUID) error
}

type authProjectStore interface {
	CreateOrganization(context.Context, db.CreateOrganizationParams) (db.Organization, error)
	UpdateOrganizationName(context.Context, db.UpdateOrganizationNameParams) error
	CreateOrganizationMember(context.Context, db.CreateOrganizationMemberParams) error
	GetFirstOrganizationMembershipByUser(context.Context, uuid.UUID) (db.OrganizationMember, error)
	CreateEnvironment(context.Context, db.CreateEnvironmentParams) (db.Environment, error)
	GetDefaultEnvironmentByOrganization(context.Context, uuid.UUID) (db.GetDefaultEnvironmentByOrganizationRow, error)
}

type authIdentityStore interface {
	CreateAuthIdentity(context.Context, db.CreateAuthIdentityParams) error
	GetAuthIdentityByProviderUserID(context.Context, db.GetAuthIdentityByProviderUserIDParams) (db.AuthIdentity, error)
}

type authSessionStore interface {
	CreateRefreshToken(context.Context, db.CreateRefreshTokenParams) error
	GetRefreshTokenByHash(context.Context, string) (db.RefreshToken, error)
	DeleteRefreshTokenByHash(context.Context, string) error
}

func WithVerificationTTL(ttl time.Duration) ServiceOption {
	return func(s *Service) {
		if ttl > 0 {
			s.verificationTTL = ttl
		}
	}
}

func WithVerificationSender(sender VerificationSender) ServiceOption {
	return func(s *Service) {
		s.verificationSender = sender
	}
}

type authStore interface {
	authUserStore
	authVerificationStore
	authProjectStore
	authIdentityStore
	authSessionStore
}

type Service struct {
	users              authUserStore
	verifications      authVerificationStore
	tenants            authProjectStore
	identities         authIdentityStore
	sessions           authSessionStore
	now                func() time.Time
	refreshTTL         time.Duration
	verificationTTL    time.Duration
	verificationSender VerificationSender
}

// HandlerService is the interface consumed by the auth HTTP handler.
type HandlerService interface {
	Signup(ctx context.Context, input SignupInput) (*SignupResult, error)
	VerifyEmail(ctx context.Context, input VerifyEmailInput) (*VerifyEmailResult, error)
	SigninWithSocial(ctx context.Context, input SocialSigninInput) (*SocialSigninResult, error)
	Signin(ctx context.Context, input SigninInput) (*SigninResult, error)
	Refresh(ctx context.Context, input RefreshInput) (*RefreshResult, error)
	CompleteOnboarding(ctx context.Context, input CompleteOnboardingInput) (*CompleteOnboardingResult, error)
	Logout(ctx context.Context, input LogoutInput) error
}

type SignupInput struct {
	FirstName   string
	LastName    string
	Email       string
	Password    string
	APIKeyName  string
}

type SignupResult struct {
	UserID                uuid.UUID `json:"user_id"`
	OrganizationID        uuid.UUID `json:"organization_id"`
	EnvironmentID         uuid.UUID `json:"environment_id"`
	Email                 string    `json:"email"`
	Role                  string    `json:"role"`
	VerificationRequired  bool      `json:"verification_required"`
	VerificationExpiresAt time.Time `json:"verification_expires_at"`
	NeedsOnboarding       bool      `json:"needs_onboarding"`
}

type SigninInput struct {
	Email    string
	Password string
}

type AuthResult struct {
	UserID          uuid.UUID `json:"user_id"`
	OrganizationID  uuid.UUID `json:"organization_id"`
	EnvironmentID   uuid.UUID `json:"environment_id"`
	Role            string    `json:"role"`
	AccessToken     string    `json:"access_token"`
	RefreshToken    string    `json:"refresh_token"`
	NeedsOnboarding bool      `json:"needs_onboarding"`
}

type SigninResult = AuthResult

type RefreshInput struct {
	RefreshToken string
}

type RefreshResult = AuthResult

type VerifyEmailInput struct {
	Email string
	Code  string
}

type VerifyEmailResult = AuthResult

type SocialSigninInput struct {
	Provider       string
	ProviderUserID string
	Email          string
	FirstName      string
	LastName       string
	FullName       string
}

type SocialSigninResult = AuthResult

type CompleteOnboardingInput struct {
	UserID           uuid.UUID
	OrganizationName string
}

type CompleteOnboardingResult struct {
	OrganizationID  uuid.UUID `json:"organization_id"`
	OrganizationName string   `json:"organization_name"`
	EnvironmentID   uuid.UUID `json:"environment_id"`
	NeedsOnboarding bool      `json:"needs_onboarding"`
}

type LogoutInput struct {
	RefreshToken string
}

func NewService(store authStore, refreshTTL time.Duration, opts ...ServiceOption) *Service {
	service := &Service{
		users:            store,
		verifications:    store,
		tenants:          store,
		identities:       store,
		sessions:         store,
		now:              time.Now,
		refreshTTL:       refreshTTL,
		verificationTTL:  defaultVerificationTTL,
	}

	for _, opt := range opts {
		opt(service)
	}

	return service
}

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
		OrganizationID:  membership.OrganizationID,
		OrganizationName: organizationName,
		EnvironmentID:   defaultEnvironment.ID,
		NeedsOnboarding: false,
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

	if err := s.sessions.DeleteRefreshTokenByHash(ctx, HashRefreshToken(rawRefreshToken)); err != nil {
		return err
	}

	return nil
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

func environmentFromDefaultRow(row db.GetDefaultEnvironmentByOrganizationRow) db.Environment {
	return db.Environment{
		ID:             row.ID,
		OrganizationID: row.OrganizationID,
		Name:           row.Name,
		IsDefault:      row.IsDefault,
		CreatedAt:      row.CreatedAt,
		UpdatedAt:      row.UpdatedAt,
	}
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

package auth

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/deveasyclick/iwifunni/internal/db"
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
	ErrProjectMembershipNotFound = errors.New("project membership not found")
)

const (
	defaultVerificationTTL    = 15 * time.Minute
	defaultPlaceholderProject = "Untitled Project"
)

type VerificationSender func(ctx context.Context, email, code string) error

type ServiceOption func(*Service)

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
	CreateUser(context.Context, db.CreateUserParams) error
	GetUserByEmail(context.Context, string) (db.GetUserByEmailRow, error)
	GetUserByID(context.Context, uuid.UUID) (db.GetUserByIDRow, error)
	UpdateUserEmailVerifiedAt(context.Context, db.UpdateUserEmailVerifiedAtParams) error
	UpdateUserOnboardingCompletedAt(context.Context, db.UpdateUserOnboardingCompletedAtParams) error
	UpsertEmailVerification(context.Context, db.UpsertEmailVerificationParams) error
	GetEmailVerificationByUserID(context.Context, uuid.UUID) (db.EmailVerification, error)
	DeleteEmailVerificationByUserID(context.Context, uuid.UUID) error
	CreateProject(context.Context, db.CreateProjectParams) error
	UpdateProjectName(context.Context, db.UpdateProjectNameParams) error
	CreateAuthIdentity(context.Context, db.CreateAuthIdentityParams) error
	GetAuthIdentityByProviderUserID(context.Context, db.GetAuthIdentityByProviderUserIDParams) (db.AuthIdentity, error)
	CreateProjectMembership(context.Context, db.CreateProjectMembershipParams) error
	GetFirstProjectMembershipByUser(context.Context, uuid.UUID) (db.ProjectMembership, error)
	CreateAPIKey(context.Context, db.CreateAPIKeyParams) error
	CreateRefreshToken(context.Context, db.CreateRefreshTokenParams) error
	GetRefreshTokenByHash(context.Context, string) (db.RefreshToken, error)
	DeleteRefreshTokenByHash(context.Context, string) error
}

type Service struct {
	store              authStore
	jwtManager         *JWTManager
	now                func() time.Time
	refreshTTL         time.Duration
	verificationTTL    time.Duration
	verificationSender VerificationSender
}

type SignupInput struct {
	FirstName   string
	LastName    string
	Email       string
	Password    string
	ProjectName string
	APIKeyName  string
}

type SignupResult struct {
	UserID                uuid.UUID `json:"user_id"`
	ProjectID             uuid.UUID `json:"project_id"`
	Email                 string    `json:"email"`
	Role                  string    `json:"role"`
	APIKey                string    `json:"api_key,omitempty"`
	AccessToken           string    `json:"access_token,omitempty"`
	RefreshToken          string    `json:"refresh_token,omitempty"`
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
	ProjectID       uuid.UUID `json:"project_id"`
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
	UserID      uuid.UUID
	ProjectName string
}

type CompleteOnboardingResult struct {
	ProjectID       uuid.UUID `json:"project_id"`
	ProjectName     string    `json:"project_name"`
	NeedsOnboarding bool      `json:"needs_onboarding"`
}

type LogoutInput struct {
	RefreshToken string
}

func NewService(store authStore, jwtManager *JWTManager, refreshTTL time.Duration, opts ...ServiceOption) *Service {
	service := &Service{
		store:           store,
		jwtManager:      jwtManager,
		now:             time.Now,
		refreshTTL:      refreshTTL,
		verificationTTL: defaultVerificationTTL,
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

	if _, err := s.store.GetUserByEmail(ctx, email); err == nil {
		return nil, ErrEmailAlreadyExists
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}

	nowTs := pgtype.Timestamptz{Time: s.now().UTC(), Valid: true}
	userID := uuid.New()
	projectID := uuid.New()
	membershipID := uuid.New()
	role := "owner"

	passwordHash, err := HashPassword(password)
	if err != nil {
		return nil, err
	}
	if err := s.store.CreateUser(ctx, db.CreateUserParams{
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

	if err := s.store.CreateProject(ctx, db.CreateProjectParams{
		ID:        projectID,
		Name:      defaultPlaceholderProject,
		CreatedAt: nowTs,
		UpdatedAt: nowTs,
	}); err != nil {
		return nil, err
	}

	if err := s.store.CreateProjectMembership(ctx, db.CreateProjectMembershipParams{
		ID:        membershipID,
		ProjectID: projectID,
		UserID:    userID,
		Role:      role,
		CreatedAt: nowTs,
		UpdatedAt: nowTs,
	}); err != nil {
		return nil, err
	}

	verificationCode, verificationHash, err := GenerateVerificationCode()
	if err != nil {
		return nil, err
	}
	verificationExpiresAt := pgtype.Timestamptz{Time: nowTs.Time.Add(s.verificationTTL), Valid: true}
	if err := s.store.UpsertEmailVerification(ctx, db.UpsertEmailVerificationParams{
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
		ProjectID:             projectID,
		Email:                 email,
		Role:                  role,
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

	user, err := s.store.GetUserByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrInvalidVerificationCode
		}
		return nil, err
	}

	verification, err := s.store.GetEmailVerificationByUserID(ctx, user.ID)
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
	if err := s.store.UpdateUserEmailVerifiedAt(ctx, db.UpdateUserEmailVerifiedAtParams{
		ID:              user.ID,
		EmailVerifiedAt: nowTs,
		UpdatedAt:       nowTs,
	}); err != nil {
		return nil, err
	}
	if err := s.store.DeleteEmailVerificationByUserID(ctx, user.ID); err != nil {
		return nil, err
	}

	membership, err := s.store.GetFirstProjectMembershipByUser(ctx, user.ID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrProjectMembershipNotFound
		}
		return nil, err
	}

	return s.newAuthResult(ctx, user.ID, membership.ProjectID, membership.Role, !user.OnboardingCompletedAt.Valid, nowTs)
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

	identity, err := s.store.GetAuthIdentityByProviderUserID(ctx, db.GetAuthIdentityByProviderUserIDParams{
		Provider:       provider,
		ProviderUserID: providerUserID,
	})
	if err == nil {
		user, userErr := s.store.GetUserByID(ctx, identity.UserID)
		if userErr != nil {
			return nil, userErr
		}
		if !user.EmailVerifiedAt.Valid {
			if err := s.store.UpdateUserEmailVerifiedAt(ctx, db.UpdateUserEmailVerifiedAtParams{
				ID:              user.ID,
				EmailVerifiedAt: nowTs,
				UpdatedAt:       nowTs,
			}); err != nil {
				return nil, err
			}
		}
		membership, membershipErr := s.ensurePrimaryMembership(ctx, identity.UserID, nowTs)
		if membershipErr != nil {
			return nil, membershipErr
		}
		return s.newAuthResult(ctx, identity.UserID, membership.ProjectID, membership.Role, !user.OnboardingCompletedAt.Valid, nowTs)
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}

	user, err := s.store.GetUserByEmail(ctx, email)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}

	userID := uuid.Nil
	needsOnboarding := true
	if errors.Is(err, pgx.ErrNoRows) {
		userID = uuid.New()
		if err := s.store.CreateUser(ctx, db.CreateUserParams{
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
			if err := s.store.UpdateUserEmailVerifiedAt(ctx, db.UpdateUserEmailVerifiedAtParams{
				ID:              user.ID,
				EmailVerifiedAt: nowTs,
				UpdatedAt:       nowTs,
			}); err != nil {
				return nil, err
			}
		}
	}

	if err := s.store.CreateAuthIdentity(ctx, db.CreateAuthIdentityParams{
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

	membership, err := s.ensurePrimaryMembership(ctx, userID, nowTs)
	if err != nil {
		return nil, err
	}

	return s.newAuthResult(ctx, userID, membership.ProjectID, membership.Role, needsOnboarding, nowTs)
}

func (s *Service) Signin(ctx context.Context, input SigninInput) (*SigninResult, error) {
	email := strings.ToLower(strings.TrimSpace(input.Email))
	password := strings.TrimSpace(input.Password)
	if email == "" || password == "" {
		return nil, fmt.Errorf("email and password are required")
	}

	user, err := s.store.GetUserByEmail(ctx, email)
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

	membership, err := s.store.GetFirstProjectMembershipByUser(ctx, user.ID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrProjectMembershipNotFound
		}
		return nil, err
	}

	nowTs := pgtype.Timestamptz{Time: s.now().UTC(), Valid: true}
	return s.newAuthResult(ctx, user.ID, membership.ProjectID, membership.Role, !user.OnboardingCompletedAt.Valid, nowTs)
}

func (s *Service) CompleteOnboarding(ctx context.Context, input CompleteOnboardingInput) (*CompleteOnboardingResult, error) {
	projectName := strings.TrimSpace(input.ProjectName)
	if input.UserID == uuid.Nil {
		return nil, fmt.Errorf("user id is required")
	}
	if projectName == "" {
		return nil, fmt.Errorf("project name is required")
	}

	membership, err := s.store.GetFirstProjectMembershipByUser(ctx, input.UserID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrProjectMembershipNotFound
		}
		return nil, err
	}

	nowTs := pgtype.Timestamptz{Time: s.now().UTC(), Valid: true}
	if err := s.store.UpdateProjectName(ctx, db.UpdateProjectNameParams{
		ID:        membership.ProjectID,
		Name:      projectName,
		UpdatedAt: nowTs,
	}); err != nil {
		return nil, err
	}
	if err := s.store.UpdateUserOnboardingCompletedAt(ctx, db.UpdateUserOnboardingCompletedAtParams{
		ID:                    input.UserID,
		OnboardingCompletedAt: nowTs,
		UpdatedAt:             nowTs,
	}); err != nil {
		return nil, err
	}

	return &CompleteOnboardingResult{
		ProjectID:       membership.ProjectID,
		ProjectName:     projectName,
		NeedsOnboarding: false,
	}, nil
}

func (s *Service) Refresh(ctx context.Context, input RefreshInput) (*RefreshResult, error) {
	rawRefreshToken := strings.TrimSpace(input.RefreshToken)
	if rawRefreshToken == "" {
		return nil, fmt.Errorf("refresh token is required")
	}

	storedToken, err := s.store.GetRefreshTokenByHash(ctx, HashRefreshToken(rawRefreshToken))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrInvalidCredentials
		}
		return nil, err
	}
	if !storedToken.ExpiresAt.Valid || storedToken.ExpiresAt.Time.Before(s.now().UTC()) {
		return nil, ErrInvalidCredentials
	}

	user, err := s.store.GetUserByID(ctx, storedToken.UserID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrInvalidCredentials
		}
		return nil, err
	}
	if !user.EmailVerifiedAt.Valid {
		return nil, ErrInvalidCredentials
	}

	membership, err := s.store.GetFirstProjectMembershipByUser(ctx, storedToken.UserID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrProjectMembershipNotFound
		}
		return nil, err
	}

	if err := s.store.DeleteRefreshTokenByHash(ctx, storedToken.TokenHash); err != nil {
		return nil, err
	}

	nowTs := pgtype.Timestamptz{Time: s.now().UTC(), Valid: true}
	return s.newAuthResult(ctx, storedToken.UserID, membership.ProjectID, membership.Role, !user.OnboardingCompletedAt.Valid, nowTs)
}

func (s *Service) Logout(ctx context.Context, input LogoutInput) error {
	rawRefreshToken := strings.TrimSpace(input.RefreshToken)
	if rawRefreshToken == "" {
		return fmt.Errorf("refresh token is required")
	}

	if err := s.store.DeleteRefreshTokenByHash(ctx, HashRefreshToken(rawRefreshToken)); err != nil {
		return err
	}

	return nil
}

func (s *Service) issueAPIKey(ctx context.Context, projectID uuid.UUID, name string, nowTs pgtype.Timestamptz) (string, string, error) {
	rawAPIKey, err := GenerateProjectAPIKey("live")
	if err != nil {
		return "", "", err
	}
	keyPrefix, err := APIKeyPrefix(rawAPIKey)
	if err != nil {
		return "", "", err
	}
	keyHash, err := HashAPIKeySecret(rawAPIKey)
	if err != nil {
		return "", "", err
	}
	scopes, err := json.Marshal([]string{"notifications:write"})
	if err != nil {
		return "", "", err
	}

	if err := s.store.CreateAPIKey(ctx, db.CreateAPIKeyParams{
		ID:          uuid.New(),
		ProjectID:   projectID,
		Name:        name,
		KeyPrefix:   keyPrefix,
		KeyHash:     keyHash,
		Scopes:      scopes,
		Status:      "active",
		ExpiresAt:   pgtype.Timestamptz{},
		RotatedFrom: pgtype.UUID{},
		CreatedAt:   nowTs,
		UpdatedAt:   nowTs,
	}); err != nil {
		return "", "", err
	}

	return rawAPIKey, keyHash, nil
}

func (s *Service) issueSession(ctx context.Context, userID, projectID uuid.UUID, role string, nowTs pgtype.Timestamptz) (string, string, error) {
	accessToken, err := s.jwtManager.GenerateAccessToken(userID.String(), projectID.String(), role)
	if err != nil {
		return "", "", err
	}
	rawRefreshToken, hashedRefreshToken, err := GenerateRefreshToken()
	if err != nil {
		return "", "", err
	}
	if err := s.store.CreateRefreshToken(ctx, db.CreateRefreshTokenParams{
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

func (s *Service) newAuthResult(ctx context.Context, userID, projectID uuid.UUID, role string, needsOnboarding bool, nowTs pgtype.Timestamptz) (*AuthResult, error) {
	accessToken, refreshToken, err := s.issueSession(ctx, userID, projectID, role, nowTs)
	if err != nil {
		return nil, err
	}

	return &AuthResult{
		UserID:          userID,
		ProjectID:       projectID,
		Role:            role,
		AccessToken:     accessToken,
		RefreshToken:    refreshToken,
		NeedsOnboarding: needsOnboarding,
	}, nil
}

func (s *Service) ensurePrimaryMembership(ctx context.Context, userID uuid.UUID, nowTs pgtype.Timestamptz) (db.ProjectMembership, error) {
	membership, err := s.store.GetFirstProjectMembershipByUser(ctx, userID)
	if err == nil {
		return membership, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return db.ProjectMembership{}, err
	}

	projectID := uuid.New()
	membershipID := uuid.New()
	role := "owner"
	if err := s.store.CreateProject(ctx, db.CreateProjectParams{
		ID:        projectID,
		Name:      defaultPlaceholderProject,
		CreatedAt: nowTs,
		UpdatedAt: nowTs,
	}); err != nil {
		return db.ProjectMembership{}, err
	}
	if err := s.store.CreateProjectMembership(ctx, db.CreateProjectMembershipParams{
		ID:        membershipID,
		ProjectID: projectID,
		UserID:    userID,
		Role:      role,
		CreatedAt: nowTs,
		UpdatedAt: nowTs,
	}); err != nil {
		return db.ProjectMembership{}, err
	}

	return db.ProjectMembership{
		ID:        membershipID,
		ProjectID: projectID,
		UserID:    userID,
		Role:      role,
		CreatedAt: nowTs,
		UpdatedAt: nowTs,
	}, nil
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

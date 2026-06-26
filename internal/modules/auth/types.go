package auth

import (
	"context"
	"errors"
	"time"

	"github.com/deveasyclick/iwifunni/internal/db"
	"github.com/google/uuid"
)

var (
	ErrEmailAlreadyExists             = errors.New("email already exists")
	ErrInvalidCredentials             = errors.New("invalid credentials")
	ErrEmailNotVerified               = errors.New("email not verified")
	ErrInvalidVerificationCode        = errors.New("invalid verification code")
	ErrVerificationCodeExpired        = errors.New("verification code expired")
	ErrUnsupportedSocialProvider      = errors.New("unsupported social provider")
	ErrSocialEmailRequired            = errors.New("social account email is required")
	ErrOrganizationMembershipNotFound = errors.New("organization membership not found")
	ErrDefaultEnvironmentNotFound     = errors.New("default environment not found")
)

const (
	defaultVerificationTTL           = 15 * time.Minute
	defaultPlaceholderOrganization   = "Untitled Organization"
	defaultDevelopmentEnvironment    = "development"
	defaultProductionEnvironment     = "production"
)

type authUserStore interface {
	CreateUser(context.Context, db.CreateUserParams) error
	GetUserByEmail(context.Context, string) (db.User, error)
	GetUserByID(context.Context, uuid.UUID) (db.User, error)
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
	GetDefaultEnvironmentByOrganization(context.Context, uuid.UUID) (db.Environment, error)
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

type authStore interface {
	authUserStore
	authVerificationStore
	authProjectStore
	authIdentityStore
	authSessionStore
}

// HandlerService is the interface consumed by the auth HTTP handler.
type HandlerService interface {
	Signup(ctx context.Context, input SignupInput) (*SignupResult, error)
	VerifyEmail(ctx context.Context, input VerifyEmailInput) (*VerifyEmailResult, error)
	ResendVerification(ctx context.Context, email string) (*ResendVerificationResult, error)
	SigninWithSocial(ctx context.Context, input SocialSigninInput) (*SocialSigninResult, error)
	Signin(ctx context.Context, input SigninInput) (*SigninResult, error)
	Refresh(ctx context.Context, input RefreshInput) (*RefreshResult, error)
	CompleteOnboarding(ctx context.Context, input CompleteOnboardingInput) (*CompleteOnboardingResult, error)
	Logout(ctx context.Context, input LogoutInput) error
}

type SignupInput struct {
	FirstName  string
	LastName   string
	Email      string
	Password   string
	APIKeyName string
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
	OrganizationID   uuid.UUID `json:"organization_id"`
	OrganizationName string    `json:"organization_name"`
	EnvironmentID    uuid.UUID `json:"environment_id"`
	NeedsOnboarding  bool      `json:"needs_onboarding"`
}

type ResendVerificationInput struct {
	Email string
}

type ResendVerificationResult struct {
	ExpiresAt time.Time `json:"expires_at"`
}

type LogoutInput struct {
	RefreshToken string
}

package auth

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/deveasyclick/iwifunni/internal/db"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

type fakeUserRecord struct {
	ID                    uuid.UUID
	Email                 string
	PasswordHash          string
	FirstName             string
	LastName              string
	EmailVerifiedAt       pgtype.Timestamptz
	OnboardingCompletedAt pgtype.Timestamptz
	CreatedAt             pgtype.Timestamptz
	UpdatedAt             pgtype.Timestamptz
}

type fakeAuthStore struct {
	usersByEmail       map[string]fakeUserRecord
	usersByID          map[uuid.UUID]fakeUserRecord
	organizations      map[uuid.UUID]db.Organization
	membershipByUser   map[uuid.UUID]db.OrganizationMember
	environmentsByOrg  map[uuid.UUID][]db.Environment
	authIdentities     map[string]db.AuthIdentity
	refreshTokens      []db.CreateRefreshTokenParams
	refreshByHash      map[string]db.RefreshToken
	emailVerifications map[uuid.UUID]db.EmailVerification
}

func newFakeAuthStore() *fakeAuthStore {
	return &fakeAuthStore{
		usersByEmail:       make(map[string]fakeUserRecord),
		usersByID:          make(map[uuid.UUID]fakeUserRecord),
		organizations:      make(map[uuid.UUID]db.Organization),
		membershipByUser:   make(map[uuid.UUID]db.OrganizationMember),
		environmentsByOrg:  make(map[uuid.UUID][]db.Environment),
		authIdentities:     make(map[string]db.AuthIdentity),
		refreshByHash:      make(map[string]db.RefreshToken),
		emailVerifications: make(map[uuid.UUID]db.EmailVerification),
	}
}

func (s *fakeAuthStore) CreateUser(_ context.Context, arg db.CreateUserParams) error {
	user := fakeUserRecord{
		ID:                    arg.ID,
		Email:                 arg.Email,
		PasswordHash:          arg.PasswordHash,
		FirstName:             arg.FirstName,
		LastName:              arg.LastName,
		EmailVerifiedAt:       arg.EmailVerifiedAt,
		OnboardingCompletedAt: arg.OnboardingCompletedAt,
		CreatedAt:             arg.CreatedAt,
		UpdatedAt:             arg.UpdatedAt,
	}
	s.usersByEmail[arg.Email] = user
	s.usersByID[arg.ID] = user
	return nil
}

func (s *fakeAuthStore) GetUserByEmail(_ context.Context, email string) (db.GetUserByEmailRow, error) {
	user, ok := s.usersByEmail[email]
	if !ok {
		return db.GetUserByEmailRow{}, pgx.ErrNoRows
	}

	return db.GetUserByEmailRow{
		ID:                    user.ID,
		Email:                 user.Email,
		PasswordHash:          user.PasswordHash,
		FirstName:             user.FirstName,
		LastName:              user.LastName,
		EmailVerifiedAt:       user.EmailVerifiedAt,
		OnboardingCompletedAt: user.OnboardingCompletedAt,
		CreatedAt:             user.CreatedAt,
		UpdatedAt:             user.UpdatedAt,
	}, nil
}

func (s *fakeAuthStore) GetUserByID(_ context.Context, id uuid.UUID) (db.GetUserByIDRow, error) {
	user, ok := s.usersByID[id]
	if !ok {
		return db.GetUserByIDRow{}, pgx.ErrNoRows
	}

	return db.GetUserByIDRow{
		ID:                    user.ID,
		Email:                 user.Email,
		PasswordHash:          user.PasswordHash,
		FirstName:             user.FirstName,
		LastName:              user.LastName,
		EmailVerifiedAt:       user.EmailVerifiedAt,
		OnboardingCompletedAt: user.OnboardingCompletedAt,
		CreatedAt:             user.CreatedAt,
		UpdatedAt:             user.UpdatedAt,
	}, nil
}

func (s *fakeAuthStore) UpdateUserEmailVerifiedAt(_ context.Context, arg db.UpdateUserEmailVerifiedAtParams) error {
	user, ok := s.usersByID[arg.ID]
	if !ok {
		return pgx.ErrNoRows
	}
	user.EmailVerifiedAt = arg.EmailVerifiedAt
	user.UpdatedAt = arg.UpdatedAt
	s.usersByID[arg.ID] = user
	s.usersByEmail[user.Email] = user
	return nil
}

func (s *fakeAuthStore) UpdateUserOnboardingCompletedAt(_ context.Context, arg db.UpdateUserOnboardingCompletedAtParams) error {
	user, ok := s.usersByID[arg.ID]
	if !ok {
		return pgx.ErrNoRows
	}
	user.OnboardingCompletedAt = arg.OnboardingCompletedAt
	user.UpdatedAt = arg.UpdatedAt
	s.usersByID[arg.ID] = user
	s.usersByEmail[user.Email] = user
	return nil
}

func (s *fakeAuthStore) UpsertEmailVerification(_ context.Context, arg db.UpsertEmailVerificationParams) error {
	s.emailVerifications[arg.UserID] = db.EmailVerification{
		UserID:     arg.UserID,
		CodeHash:   arg.CodeHash,
		ExpiresAt:  arg.ExpiresAt,
		ConsumedAt: arg.ConsumedAt,
		CreatedAt:  arg.CreatedAt,
		UpdatedAt:  arg.UpdatedAt,
	}
	return nil
}

func (s *fakeAuthStore) GetEmailVerificationByUserID(_ context.Context, userID uuid.UUID) (db.EmailVerification, error) {
	verification, ok := s.emailVerifications[userID]
	if !ok {
		return db.EmailVerification{}, pgx.ErrNoRows
	}
	return verification, nil
}

func (s *fakeAuthStore) DeleteEmailVerificationByUserID(_ context.Context, userID uuid.UUID) error {
	delete(s.emailVerifications, userID)
	return nil
}

func (s *fakeAuthStore) CreateOrganization(_ context.Context, arg db.CreateOrganizationParams) (db.Organization, error) {
	org := db.Organization{ID: arg.ID, Name: arg.Name, CreatedAt: arg.CreatedAt, UpdatedAt: arg.UpdatedAt}
	s.organizations[arg.ID] = org
	return org, nil
}

func (s *fakeAuthStore) UpdateOrganizationName(_ context.Context, arg db.UpdateOrganizationNameParams) error {
	org, ok := s.organizations[arg.ID]
	if !ok {
		return pgx.ErrNoRows
	}
	org.Name = arg.Name
	org.UpdatedAt = arg.UpdatedAt
	s.organizations[arg.ID] = org
	return nil
}

func (s *fakeAuthStore) CreateOrganizationMember(_ context.Context, arg db.CreateOrganizationMemberParams) error {
	s.membershipByUser[arg.UserID] = db.OrganizationMember{
		ID:             arg.ID,
		OrganizationID: arg.OrganizationID,
		UserID:         arg.UserID,
		Role:           arg.Role,
		CreatedAt:      arg.CreatedAt,
	}
	return nil
}

func (s *fakeAuthStore) GetFirstOrganizationMembershipByUser(_ context.Context, userID uuid.UUID) (db.OrganizationMember, error) {
	membership, ok := s.membershipByUser[userID]
	if !ok {
		return db.OrganizationMember{}, pgx.ErrNoRows
	}
	return membership, nil
}

func (s *fakeAuthStore) CreateEnvironment(_ context.Context, arg db.CreateEnvironmentParams) (db.Environment, error) {
	environment := db.Environment{
		ID:             arg.ID,
		Name:           arg.Name,
		OrganizationID: arg.OrganizationID,
		CreatedAt:      arg.CreatedAt,
		UpdatedAt:      arg.UpdatedAt,
		IsDefault:      arg.IsDefault,
	}
	s.environmentsByOrg[arg.OrganizationID] = append(s.environmentsByOrg[arg.OrganizationID], environment)
	return environment, nil
}

func (s *fakeAuthStore) GetDefaultEnvironmentByOrganization(_ context.Context, organizationID uuid.UUID) (db.GetDefaultEnvironmentByOrganizationRow, error) {
	for _, environment := range s.environmentsByOrg[organizationID] {
		if environment.IsDefault {
			return db.GetDefaultEnvironmentByOrganizationRow{
				ID:             environment.ID,
				OrganizationID: environment.OrganizationID,
				Name:           environment.Name,
				IsDefault:      environment.IsDefault,
				CreatedAt:      environment.CreatedAt,
				UpdatedAt:      environment.UpdatedAt,
			}, nil
		}
	}
	return db.GetDefaultEnvironmentByOrganizationRow{}, pgx.ErrNoRows
}

func (s *fakeAuthStore) CreateAuthIdentity(_ context.Context, arg db.CreateAuthIdentityParams) error {
	s.authIdentities[arg.Provider+":"+arg.ProviderUserID] = db.AuthIdentity{
		ID:             arg.ID,
		UserID:         arg.UserID,
		Provider:       arg.Provider,
		ProviderUserID: arg.ProviderUserID,
		Email:          arg.Email,
		CreatedAt:      arg.CreatedAt,
		UpdatedAt:      arg.UpdatedAt,
	}
	return nil
}

func (s *fakeAuthStore) GetAuthIdentityByProviderUserID(_ context.Context, arg db.GetAuthIdentityByProviderUserIDParams) (db.AuthIdentity, error) {
	identity, ok := s.authIdentities[arg.Provider+":"+arg.ProviderUserID]
	if !ok {
		return db.AuthIdentity{}, pgx.ErrNoRows
	}
	return identity, nil
}

func (s *fakeAuthStore) CreateRefreshToken(_ context.Context, arg db.CreateRefreshTokenParams) error {
	s.refreshTokens = append(s.refreshTokens, arg)
	s.refreshByHash[arg.TokenHash] = db.RefreshToken{
		ID:        arg.ID,
		UserID:    arg.UserID,
		TokenHash: arg.TokenHash,
		ExpiresAt: arg.ExpiresAt,
		CreatedAt: arg.CreatedAt,
		UpdatedAt: arg.UpdatedAt,
	}
	return nil
}

func (s *fakeAuthStore) GetRefreshTokenByHash(_ context.Context, tokenHash string) (db.RefreshToken, error) {
	refreshToken, ok := s.refreshByHash[tokenHash]
	if !ok {
		return db.RefreshToken{}, pgx.ErrNoRows
	}
	return refreshToken, nil
}

func (s *fakeAuthStore) DeleteRefreshTokenByHash(_ context.Context, tokenHash string) error {
	delete(s.refreshByHash, tokenHash)
	return nil
}

func fixedAuthService(store *fakeAuthStore) *Service {
	service := NewService(store, NewJWTManager("test-secret", "iwifunni-test", 15*time.Minute), 24*time.Hour)
	service.now = func() time.Time {
		return time.Date(2026, time.April, 26, 12, 0, 0, 0, time.UTC)
	}
	service.jwtManager.now = service.now
	return service
}

func TestServiceSignupCreatesPendingVerification(t *testing.T) {
	t.Parallel()

	store := newFakeAuthStore()
	var deliveredCode string
	service := NewService(
		store,
		NewJWTManager("test-secret", "iwifunni-test", 15*time.Minute),
		24*time.Hour,
		WithVerificationSender(func(_ context.Context, _, code string) error {
			deliveredCode = code
			return nil
		}),
	)
	service.now = func() time.Time {
		return time.Date(2026, time.April, 26, 12, 0, 0, 0, time.UTC)
	}
	service.jwtManager.now = service.now

	result, err := service.Signup(context.Background(), SignupInput{
		FirstName: "Ada",
		LastName:  "Lovelace",
		Email:     "User@Example.com",
		Password:  "correct-horse-battery-staple",
	})
	if err != nil {
		t.Fatalf("Signup() error = %v", err)
	}
	if result.UserID == uuid.Nil || result.OrganizationID == uuid.Nil || result.EnvironmentID == uuid.Nil {
		t.Fatal("Signup() should return seeded user, organization, and environment ids")
	}
	if deliveredCode == "" || len(deliveredCode) != 6 {
		t.Fatalf("verification code = %q, want six digits", deliveredCode)
	}
	storedUser, err := store.GetUserByEmail(context.Background(), "user@example.com")
	if err != nil {
		t.Fatalf("GetUserByEmail() error = %v", err)
	}
	if storedUser.PasswordHash == "correct-horse-battery-staple" {
		t.Fatal("password was stored in plaintext")
	}
	if storedUser.EmailVerifiedAt.Valid {
		t.Fatal("Signup() should not mark the user as verified")
	}
	if store.organizations[result.OrganizationID].Name != defaultPlaceholderOrganization {
		t.Fatalf("placeholder organization name = %q, want %q", store.organizations[result.OrganizationID].Name, defaultPlaceholderOrganization)
	}
	defaultEnvironment, err := store.GetDefaultEnvironmentByOrganization(context.Background(), result.OrganizationID)
	if err != nil {
		t.Fatalf("GetDefaultEnvironmentByOrganization() error = %v", err)
	}
	if defaultEnvironment.ID != result.EnvironmentID {
		t.Fatalf("EnvironmentID = %s, want %s", result.EnvironmentID, defaultEnvironment.ID)
	}
	if defaultEnvironment.Name != defaultDevelopmentEnvironment {
		t.Fatalf("default environment = %q, want %q", defaultEnvironment.Name, defaultDevelopmentEnvironment)
	}
	if len(store.environmentsByOrg[result.OrganizationID]) != 2 {
		t.Fatalf("environment count = %d, want 2", len(store.environmentsByOrg[result.OrganizationID]))
	}
}

func TestServiceSignupRejectsDuplicateEmail(t *testing.T) {
	t.Parallel()

	store := newFakeAuthStore()
	userID := uuid.New()
	user := fakeUserRecord{ID: userID, Email: "user@example.com"}
	store.usersByEmail[user.Email] = user
	store.usersByID[userID] = user
	service := fixedAuthService(store)

	_, err := service.Signup(context.Background(), SignupInput{
		FirstName: "Ada",
		LastName:  "Lovelace",
		Email:     "user@example.com",
		Password:  "correct-horse-battery-staple",
	})
	if !errors.Is(err, ErrEmailAlreadyExists) {
		t.Fatalf("Signup() error = %v, want %v", err, ErrEmailAlreadyExists)
	}
}

func TestServiceVerifyEmailIssuesSession(t *testing.T) {
	t.Parallel()

	store := newFakeAuthStore()
	var deliveredCode string
	service := NewService(
		store,
		NewJWTManager("test-secret", "iwifunni-test", 15*time.Minute),
		24*time.Hour,
		WithVerificationSender(func(_ context.Context, _, code string) error {
			deliveredCode = code
			return nil
		}),
	)
	service.now = func() time.Time {
		return time.Date(2026, time.April, 26, 12, 0, 0, 0, time.UTC)
	}
	service.jwtManager.now = service.now

	signup, err := service.Signup(context.Background(), SignupInput{
		FirstName: "Ada",
		LastName:  "Lovelace",
		Email:     "user@example.com",
		Password:  "correct-horse-battery-staple",
	})
	if err != nil {
		t.Fatalf("Signup() error = %v", err)
	}

	result, err := service.VerifyEmail(context.Background(), VerifyEmailInput{Email: signup.Email, Code: deliveredCode})
	if err != nil {
		t.Fatalf("VerifyEmail() error = %v", err)
	}
	if result.AccessToken == "" || result.RefreshToken == "" {
		t.Fatal("VerifyEmail() should issue session tokens")
	}
	if result.OrganizationID != signup.OrganizationID || result.EnvironmentID != signup.EnvironmentID {
		t.Fatal("VerifyEmail() should reuse the seeded organization and environment")
	}
	if len(store.refreshTokens) != 1 {
		t.Fatalf("refresh token inserts = %d, want 1", len(store.refreshTokens))
	}
}

func TestServiceSigninRejectsUnverifiedEmail(t *testing.T) {
	t.Parallel()

	passwordHash, err := HashPassword("correct-horse-battery-staple")
	if err != nil {
		t.Fatalf("HashPassword() error = %v", err)
	}

	userID := uuid.New()
	store := newFakeAuthStore()
	user := fakeUserRecord{ID: userID, Email: "user@example.com", PasswordHash: passwordHash}
	store.usersByEmail[user.Email] = user
	store.usersByID[userID] = user
	service := fixedAuthService(store)

	_, err = service.Signin(context.Background(), SigninInput{Email: "user@example.com", Password: "correct-horse-battery-staple"})
	if !errors.Is(err, ErrEmailNotVerified) {
		t.Fatalf("Signin() error = %v, want %v", err, ErrEmailNotVerified)
	}
}

func TestServiceCompleteOnboarding(t *testing.T) {
	t.Parallel()

	store := newFakeAuthStore()
	service := fixedAuthService(store)

	signup, err := service.Signup(context.Background(), SignupInput{
		FirstName: "Ada",
		LastName:  "Lovelace",
		Email:     "user@example.com",
		Password:  "correct-horse-battery-staple",
	})
	if err != nil {
		t.Fatalf("Signup() error = %v", err)
	}

	result, err := service.CompleteOnboarding(context.Background(), CompleteOnboardingInput{
		UserID:           signup.UserID,
		OrganizationName: "Acme",
	})
	if err != nil {
		t.Fatalf("CompleteOnboarding() error = %v", err)
	}
	if result.OrganizationName != "Acme" {
		t.Fatalf("OrganizationName = %q, want %q", result.OrganizationName, "Acme")
	}
	if store.organizations[signup.OrganizationID].Name != "Acme" {
		t.Fatalf("stored organization name = %q, want %q", store.organizations[signup.OrganizationID].Name, "Acme")
	}
	if !store.usersByID[signup.UserID].OnboardingCompletedAt.Valid {
		t.Fatal("CompleteOnboarding() should mark onboarding complete")
	}
}

func TestServiceRefreshIncludesOnboardingState(t *testing.T) {
	t.Parallel()

	userID := uuid.New()
	orgID := uuid.New()
	envID := uuid.New()
	passwordHash, err := HashPassword("correct-horse-battery-staple")
	if err != nil {
		t.Fatalf("HashPassword() error = %v", err)
	}
	verifiedAt := pgtype.Timestamptz{Time: time.Date(2026, time.April, 25, 12, 0, 0, 0, time.UTC), Valid: true}

	store := newFakeAuthStore()
	user := fakeUserRecord{ID: userID, Email: "user@example.com", PasswordHash: passwordHash, EmailVerifiedAt: verifiedAt}
	store.usersByEmail[user.Email] = user
	store.usersByID[userID] = user
	store.membershipByUser[userID] = db.OrganizationMember{ID: uuid.New(), OrganizationID: orgID, UserID: userID, Role: "owner", CreatedAt: verifiedAt}
	store.environmentsByOrg[orgID] = []db.Environment{{ID: envID, OrganizationID: orgID, Name: defaultDevelopmentEnvironment, IsDefault: true, CreatedAt: verifiedAt, UpdatedAt: verifiedAt}}
	store.refreshByHash[HashRefreshToken("refresh-token")] = db.RefreshToken{ID: uuid.New(), UserID: userID, TokenHash: HashRefreshToken("refresh-token"), ExpiresAt: pgtype.Timestamptz{Time: time.Date(2026, time.April, 27, 12, 0, 0, 0, time.UTC), Valid: true}}

	service := fixedAuthService(store)

	result, err := service.Refresh(context.Background(), RefreshInput{RefreshToken: "refresh-token"})
	if err != nil {
		t.Fatalf("Refresh() error = %v", err)
	}
	if !result.NeedsOnboarding {
		t.Fatal("Refresh() should preserve onboarding-required state")
	}
	if result.OrganizationID != orgID || result.EnvironmentID != envID {
		t.Fatal("Refresh() should return the organization and default environment")
	}
}

func TestServiceSigninWithSocialCreatesVerifiedUser(t *testing.T) {
	t.Parallel()

	store := newFakeAuthStore()
	service := fixedAuthService(store)

	result, err := service.SigninWithSocial(context.Background(), SocialSigninInput{
		Provider:       "google",
		ProviderUserID: "google-user-1",
		Email:          "social@example.com",
		FirstName:      "Grace",
		LastName:       "Hopper",
	})
	if err != nil {
		t.Fatalf("SigninWithSocial() error = %v", err)
	}
	if result.OrganizationID == uuid.Nil || result.EnvironmentID == uuid.Nil {
		t.Fatal("SigninWithSocial() should return organization and environment ids")
	}
	user, err := store.GetUserByEmail(context.Background(), "social@example.com")
	if err != nil {
		t.Fatalf("GetUserByEmail() error = %v", err)
	}
	if !user.EmailVerifiedAt.Valid {
		t.Fatal("social signup should mark the user as verified")
	}
	if _, ok := store.authIdentities["google:google-user-1"]; !ok {
		t.Fatal("social signup should create an auth identity")
	}
}

func TestServiceSigninWithSocialLinksExistingUser(t *testing.T) {
	t.Parallel()

	store := newFakeAuthStore()
	userID := uuid.New()
	orgID := uuid.New()
	envID := uuid.New()
	nowTs := pgtype.Timestamptz{Time: time.Date(2026, time.May, 14, 12, 0, 0, 0, time.UTC), Valid: true}
	user := fakeUserRecord{ID: userID, Email: "existing@example.com", FirstName: "Existing", LastName: "User"}
	store.usersByEmail[user.Email] = user
	store.usersByID[userID] = user
	store.organizations[orgID] = db.Organization{ID: orgID, Name: defaultPlaceholderOrganization, CreatedAt: nowTs, UpdatedAt: nowTs}
	store.membershipByUser[userID] = db.OrganizationMember{ID: uuid.New(), OrganizationID: orgID, UserID: userID, Role: "owner", CreatedAt: nowTs}
	store.environmentsByOrg[orgID] = []db.Environment{{ID: envID, OrganizationID: orgID, Name: defaultDevelopmentEnvironment, IsDefault: true, CreatedAt: nowTs, UpdatedAt: nowTs}}

	service := fixedAuthService(store)

	result, err := service.SigninWithSocial(context.Background(), SocialSigninInput{
		Provider:       "github",
		ProviderUserID: "github-user-1",
		Email:          "existing@example.com",
		FullName:       "Existing User",
	})
	if err != nil {
		t.Fatalf("SigninWithSocial() error = %v", err)
	}
	if result.OrganizationID != orgID || result.EnvironmentID != envID {
		t.Fatal("SigninWithSocial() should return the existing tenant context")
	}
	if !store.usersByID[userID].EmailVerifiedAt.Valid {
		t.Fatal("social signin should verify an existing email/password account")
	}
}

func TestServiceLogout(t *testing.T) {
	t.Parallel()

	store := newFakeAuthStore()
	hash := HashRefreshToken("refresh-token")
	store.refreshByHash[hash] = db.RefreshToken{ID: uuid.New(), UserID: uuid.New(), TokenHash: hash}
	service := fixedAuthService(store)

	if err := service.Logout(context.Background(), LogoutInput{RefreshToken: "refresh-token"}); err != nil {
		t.Fatalf("Logout() error = %v", err)
	}
	if _, ok := store.refreshByHash[hash]; ok {
		t.Fatal("Logout() did not delete refresh token")
	}
}

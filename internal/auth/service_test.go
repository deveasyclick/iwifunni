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
	membershipByUser   map[uuid.UUID]db.ProjectMembership
	projects           map[uuid.UUID]db.Project
	authIdentities     map[string]db.AuthIdentity
	apiKeys            []db.CreateAPIKeyParams
	refreshTokens      []db.CreateRefreshTokenParams
	refreshByHash      map[string]db.RefreshToken
	emailVerifications map[uuid.UUID]db.EmailVerification
}

func newFakeAuthStore() *fakeAuthStore {
	return &fakeAuthStore{
		usersByEmail:       make(map[string]fakeUserRecord),
		usersByID:          make(map[uuid.UUID]fakeUserRecord),
		membershipByUser:   make(map[uuid.UUID]db.ProjectMembership),
		projects:           make(map[uuid.UUID]db.Project),
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

func (s *fakeAuthStore) CreateProject(_ context.Context, arg db.CreateProjectParams) error {
	s.projects[arg.ID] = db.Project{
		ID:        arg.ID,
		Name:      arg.Name,
		CreatedAt: arg.CreatedAt,
		UpdatedAt: arg.UpdatedAt,
	}
	return nil
}

func (s *fakeAuthStore) UpdateProjectName(_ context.Context, arg db.UpdateProjectNameParams) error {
	project, ok := s.projects[arg.ID]
	if !ok {
		return pgx.ErrNoRows
	}
	project.Name = arg.Name
	project.UpdatedAt = arg.UpdatedAt
	s.projects[arg.ID] = project
	return nil
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

func (s *fakeAuthStore) CreateProjectMembership(_ context.Context, arg db.CreateProjectMembershipParams) error {
	s.membershipByUser[arg.UserID] = db.ProjectMembership{
		ID:        arg.ID,
		ProjectID: arg.ProjectID,
		UserID:    arg.UserID,
		Role:      arg.Role,
		CreatedAt: arg.CreatedAt,
		UpdatedAt: arg.UpdatedAt,
	}
	return nil
}

func (s *fakeAuthStore) GetFirstProjectMembershipByUser(_ context.Context, userID uuid.UUID) (db.ProjectMembership, error) {
	membership, ok := s.membershipByUser[userID]
	if !ok {
		return db.ProjectMembership{}, pgx.ErrNoRows
	}
	return membership, nil
}

func (s *fakeAuthStore) CreateAPIKey(_ context.Context, arg db.CreateAPIKeyParams) error {
	s.apiKeys = append(s.apiKeys, arg)
	return nil
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
	if result.UserID == uuid.Nil {
		t.Fatal("Signup() returned empty user id")
	}
	if result.ProjectID == uuid.Nil {
		t.Fatal("Signup() returned empty project id")
	}
	if !result.VerificationRequired {
		t.Fatal("Signup() should require verification")
	}
	if result.AccessToken != "" || result.RefreshToken != "" {
		t.Fatal("Signup() should not issue session tokens before verification")
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
	if storedUser.FirstName != "Ada" || storedUser.LastName != "Lovelace" {
		t.Fatalf("stored names = %q %q, want Ada Lovelace", storedUser.FirstName, storedUser.LastName)
	}
	if storedUser.EmailVerifiedAt.Valid {
		t.Fatal("Signup() should not mark the user as verified")
	}
	verification, ok := store.emailVerifications[result.UserID]
	if !ok {
		t.Fatal("Signup() should persist a verification record")
	}
	if !CompareVerificationCode(deliveredCode, verification.CodeHash) {
		t.Fatal("stored verification hash does not match delivered code")
	}
	if store.projects[result.ProjectID].Name != defaultPlaceholderProject {
		t.Fatalf("placeholder project name = %q, want %q", store.projects[result.ProjectID].Name, defaultPlaceholderProject)
	}
}

func TestServiceSignupRejectsDuplicateEmail(t *testing.T) {
	t.Parallel()

	store := newFakeAuthStore()
	userID := uuid.New()
	user := fakeUserRecord{ID: userID, Email: "user@example.com"}
	store.usersByEmail[user.Email] = user
	store.usersByID[userID] = user
	service := NewService(store, NewJWTManager("test-secret", "iwifunni-test", 15*time.Minute), 24*time.Hour)

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

	result, err := service.VerifyEmail(context.Background(), VerifyEmailInput{
		Email: signup.Email,
		Code:  deliveredCode,
	})
	if err != nil {
		t.Fatalf("VerifyEmail() error = %v", err)
	}
	if result.AccessToken == "" || result.RefreshToken == "" {
		t.Fatal("VerifyEmail() should issue session tokens")
	}
	if !result.NeedsOnboarding {
		t.Fatal("VerifyEmail() should keep onboarding pending")
	}
	storedUser, err := store.GetUserByEmail(context.Background(), signup.Email)
	if err != nil {
		t.Fatalf("GetUserByEmail() error = %v", err)
	}
	if !storedUser.EmailVerifiedAt.Valid {
		t.Fatal("VerifyEmail() should mark the user as verified")
	}
	if _, ok := store.emailVerifications[signup.UserID]; ok {
		t.Fatal("VerifyEmail() should consume the verification record")
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
	store.membershipByUser[userID] = db.ProjectMembership{
		ID:        uuid.New(),
		ProjectID: uuid.New(),
		UserID:    userID,
		Role:      "owner",
		CreatedAt: pgtype.Timestamptz{Time: time.Now().UTC(), Valid: true},
		UpdatedAt: pgtype.Timestamptz{Time: time.Now().UTC(), Valid: true},
	}
	service := NewService(store, NewJWTManager("test-secret", "iwifunni-test", 15*time.Minute), 24*time.Hour)

	_, err = service.Signin(context.Background(), SigninInput{
		Email:    "user@example.com",
		Password: "correct-horse-battery-staple",
	})
	if !errors.Is(err, ErrEmailNotVerified) {
		t.Fatalf("Signin() error = %v, want %v", err, ErrEmailNotVerified)
	}
}

func TestServiceCompleteOnboarding(t *testing.T) {
	t.Parallel()

	userID := uuid.New()
	projectID := uuid.New()
	nowTs := pgtype.Timestamptz{Time: time.Date(2026, time.April, 26, 12, 0, 0, 0, time.UTC), Valid: true}
	store := newFakeAuthStore()
	user := fakeUserRecord{ID: userID, Email: "user@example.com", EmailVerifiedAt: nowTs}
	store.usersByEmail[user.Email] = user
	store.usersByID[userID] = user
	store.projects[projectID] = db.Project{ID: projectID, Name: defaultPlaceholderProject, CreatedAt: nowTs, UpdatedAt: nowTs}
	store.membershipByUser[userID] = db.ProjectMembership{
		ID:        uuid.New(),
		ProjectID: projectID,
		UserID:    userID,
		Role:      "owner",
		CreatedAt: nowTs,
		UpdatedAt: nowTs,
	}

	service := NewService(store, NewJWTManager("test-secret", "iwifunni-test", 15*time.Minute), 24*time.Hour)
	service.now = func() time.Time {
		return time.Date(2026, time.April, 26, 12, 0, 0, 0, time.UTC)
	}
	service.jwtManager.now = service.now

	result, err := service.CompleteOnboarding(context.Background(), CompleteOnboardingInput{
		UserID:      userID,
		ProjectName: "Acme",
	})
	if err != nil {
		t.Fatalf("CompleteOnboarding() error = %v", err)
	}
	if result.ProjectName != "Acme" {
		t.Fatalf("ProjectName = %q, want %q", result.ProjectName, "Acme")
	}
	if result.NeedsOnboarding {
		t.Fatal("CompleteOnboarding() should clear onboarding state")
	}
	if store.projects[projectID].Name != "Acme" {
		t.Fatalf("stored project name = %q, want %q", store.projects[projectID].Name, "Acme")
	}
	if !store.usersByID[userID].OnboardingCompletedAt.Valid {
		t.Fatal("CompleteOnboarding() should mark onboarding complete")
	}
}

func TestServiceRefreshIncludesOnboardingState(t *testing.T) {
	t.Parallel()

	userID := uuid.New()
	projectID := uuid.New()
	passwordHash, err := HashPassword("correct-horse-battery-staple")
	if err != nil {
		t.Fatalf("HashPassword() error = %v", err)
	}
	verifiedAt := pgtype.Timestamptz{Time: time.Date(2026, time.April, 25, 12, 0, 0, 0, time.UTC), Valid: true}

	store := newFakeAuthStore()
	user := fakeUserRecord{
		ID:              userID,
		Email:           "user@example.com",
		PasswordHash:    passwordHash,
		EmailVerifiedAt: verifiedAt,
	}
	store.usersByEmail[user.Email] = user
	store.usersByID[userID] = user
	store.membershipByUser[userID] = db.ProjectMembership{
		ID:        uuid.New(),
		ProjectID: projectID,
		UserID:    userID,
		Role:      "owner",
		CreatedAt: verifiedAt,
		UpdatedAt: verifiedAt,
	}
	store.refreshByHash[HashRefreshToken("refresh-token")] = db.RefreshToken{
		ID:        uuid.New(),
		UserID:    userID,
		TokenHash: HashRefreshToken("refresh-token"),
		ExpiresAt: pgtype.Timestamptz{Time: time.Date(2026, time.April, 27, 12, 0, 0, 0, time.UTC), Valid: true},
	}

	service := NewService(store, NewJWTManager("test-secret", "iwifunni-test", 15*time.Minute), 24*time.Hour)
	service.now = func() time.Time {
		return time.Date(2026, time.April, 26, 12, 0, 0, 0, time.UTC)
	}
	service.jwtManager.now = service.now

	result, err := service.Refresh(context.Background(), RefreshInput{RefreshToken: "refresh-token"})
	if err != nil {
		t.Fatalf("Refresh() error = %v", err)
	}
	if !result.NeedsOnboarding {
		t.Fatal("Refresh() should preserve onboarding-required state")
	}
	if len(store.refreshByHash) != 1 {
		t.Fatalf("refresh token count = %d, want 1 after rotation", len(store.refreshByHash))
	}
}

func TestServiceSigninWithSocialCreatesVerifiedUser(t *testing.T) {
	t.Parallel()

	store := newFakeAuthStore()
	service := NewService(store, NewJWTManager("test-secret", "iwifunni-test", 15*time.Minute), 24*time.Hour)
	service.now = func() time.Time {
		return time.Date(2026, time.May, 15, 12, 0, 0, 0, time.UTC)
	}
	service.jwtManager.now = service.now

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
	if result.UserID == uuid.Nil || result.ProjectID == uuid.Nil {
		t.Fatal("SigninWithSocial() should return user and project ids")
	}
	if !result.NeedsOnboarding {
		t.Fatal("SigninWithSocial() should require onboarding for new social users")
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
	projectID := uuid.New()
	nowTs := pgtype.Timestamptz{Time: time.Date(2026, time.May, 14, 12, 0, 0, 0, time.UTC), Valid: true}
	user := fakeUserRecord{
		ID:        userID,
		Email:     "existing@example.com",
		FirstName: "Existing",
		LastName:  "User",
	}
	store.usersByEmail[user.Email] = user
	store.usersByID[userID] = user
	store.projects[projectID] = db.Project{ID: projectID, Name: defaultPlaceholderProject, CreatedAt: nowTs, UpdatedAt: nowTs}
	store.membershipByUser[userID] = db.ProjectMembership{
		ID:        uuid.New(),
		ProjectID: projectID,
		UserID:    userID,
		Role:      "owner",
		CreatedAt: nowTs,
		UpdatedAt: nowTs,
	}

	service := NewService(store, NewJWTManager("test-secret", "iwifunni-test", 15*time.Minute), 24*time.Hour)
	service.now = func() time.Time {
		return time.Date(2026, time.May, 15, 12, 0, 0, 0, time.UTC)
	}
	service.jwtManager.now = service.now

	result, err := service.SigninWithSocial(context.Background(), SocialSigninInput{
		Provider:       "github",
		ProviderUserID: "github-user-1",
		Email:          "existing@example.com",
		FullName:       "Existing User",
	})
	if err != nil {
		t.Fatalf("SigninWithSocial() error = %v", err)
	}
	if result.ProjectID != projectID {
		t.Fatalf("ProjectID = %s, want %s", result.ProjectID, projectID)
	}
	if !store.usersByID[userID].EmailVerifiedAt.Valid {
		t.Fatal("social signin should verify an existing email/password account")
	}
	if _, ok := store.authIdentities["github:github-user-1"]; !ok {
		t.Fatal("social signin should link the auth identity")
	}
}

func TestServiceLogout(t *testing.T) {
	t.Parallel()

	store := newFakeAuthStore()
	hash := HashRefreshToken("refresh-token")
	store.refreshByHash[hash] = db.RefreshToken{ID: uuid.New(), UserID: uuid.New(), TokenHash: hash}
	service := NewService(store, NewJWTManager("test-secret", "iwifunni-test", 15*time.Minute), 24*time.Hour)

	if err := service.Logout(context.Background(), LogoutInput{RefreshToken: "refresh-token"}); err != nil {
		t.Fatalf("Logout() error = %v", err)
	}
	if _, ok := store.refreshByHash[hash]; ok {
		t.Fatal("Logout() did not delete refresh token")
	}
}

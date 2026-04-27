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

type fakeAuthStore struct {
	users            map[string]db.User
	membershipByUser map[uuid.UUID]db.ProjectMembership
	apiKeys          []db.CreateAPIKeyParams
	refreshTokens    []db.CreateRefreshTokenParams
	refreshByHash    map[string]db.RefreshToken
}

func newFakeAuthStore() *fakeAuthStore {
	return &fakeAuthStore{
		users:            make(map[string]db.User),
		membershipByUser: make(map[uuid.UUID]db.ProjectMembership),
		refreshByHash:    make(map[string]db.RefreshToken),
	}
}

func (s *fakeAuthStore) CreateUser(_ context.Context, arg db.CreateUserParams) error {
	s.users[arg.Email] = db.User{
		ID:           arg.ID,
		Email:        arg.Email,
		PasswordHash: arg.PasswordHash,
		CreatedAt:    arg.CreatedAt,
		UpdatedAt:    arg.UpdatedAt,
	}
	return nil
}

func (s *fakeAuthStore) GetUserByEmail(_ context.Context, email string) (db.User, error) {
	user, ok := s.users[email]
	if !ok {
		return db.User{}, pgx.ErrNoRows
	}
	return user, nil
}

func (s *fakeAuthStore) CreateProject(_ context.Context, _ db.CreateProjectParams) error {
	return nil
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

func TestServiceSignup(t *testing.T) {
	t.Parallel()

	store := newFakeAuthStore()
	service := NewService(store, NewJWTManager("test-secret", "iwifunni-test", 15*time.Minute), 24*time.Hour)
	service.now = func() time.Time {
		return time.Date(2026, time.April, 26, 12, 0, 0, 0, time.UTC)
	}
	service.jwtManager.now = service.now

	result, err := service.Signup(context.Background(), SignupInput{
		Email:       "User@Example.com",
		Password:    "correct-horse-battery-staple",
		ProjectName: "Acme",
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
	if result.APIKey == "" || result.AccessToken == "" || result.RefreshToken == "" {
		t.Fatal("Signup() returned missing credentials")
	}
	if len(store.apiKeys) != 1 {
		t.Fatalf("api key inserts = %d, want 1", len(store.apiKeys))
	}
	if len(store.refreshTokens) != 1 {
		t.Fatalf("refresh token inserts = %d, want 1", len(store.refreshTokens))
	}

	storedUser, err := store.GetUserByEmail(context.Background(), "user@example.com")
	if err != nil {
		t.Fatalf("GetUserByEmail() error = %v", err)
	}
	if storedUser.PasswordHash == "correct-horse-battery-staple" {
		t.Fatal("password was stored in plaintext")
	}
}

func TestServiceSignupRejectsDuplicateEmail(t *testing.T) {
	t.Parallel()

	store := newFakeAuthStore()
	store.users["user@example.com"] = db.User{ID: uuid.New(), Email: "user@example.com"}
	service := NewService(store, NewJWTManager("test-secret", "iwifunni-test", 15*time.Minute), 24*time.Hour)

	_, err := service.Signup(context.Background(), SignupInput{
		Email:       "user@example.com",
		Password:    "correct-horse-battery-staple",
		ProjectName: "Acme",
	})
	if !errors.Is(err, ErrEmailAlreadyExists) {
		t.Fatalf("Signup() error = %v, want %v", err, ErrEmailAlreadyExists)
	}
}

func TestServiceSignin(t *testing.T) {
	t.Parallel()

	passwordHash, err := HashPassword("correct-horse-battery-staple")
	if err != nil {
		t.Fatalf("HashPassword() error = %v", err)
	}

	userID := uuid.New()
	projectID := uuid.New()
	store := newFakeAuthStore()
	store.users["user@example.com"] = db.User{ID: userID, Email: "user@example.com", PasswordHash: passwordHash}
	store.membershipByUser[userID] = db.ProjectMembership{
		ID:        uuid.New(),
		ProjectID: projectID,
		UserID:    userID,
		Role:      "owner",
		CreatedAt: pgtype.Timestamptz{Time: time.Now().UTC(), Valid: true},
		UpdatedAt: pgtype.Timestamptz{Time: time.Now().UTC(), Valid: true},
	}

	service := NewService(store, NewJWTManager("test-secret", "iwifunni-test", 15*time.Minute), 24*time.Hour)
	service.now = func() time.Time {
		return time.Date(2026, time.April, 26, 12, 0, 0, 0, time.UTC)
	}
	service.jwtManager.now = service.now

	result, err := service.Signin(context.Background(), SigninInput{
		Email:    "user@example.com",
		Password: "correct-horse-battery-staple",
	})
	if err != nil {
		t.Fatalf("Signin() error = %v", err)
	}
	if result.ProjectID != projectID {
		t.Fatalf("ProjectID = %s, want %s", result.ProjectID, projectID)
	}
	if len(store.refreshTokens) != 1 {
		t.Fatalf("refresh token inserts = %d, want 1", len(store.refreshTokens))
	}
}

func TestServiceSigninRejectsInvalidCredentials(t *testing.T) {
	t.Parallel()

	store := newFakeAuthStore()
	service := NewService(store, NewJWTManager("test-secret", "iwifunni-test", 15*time.Minute), 24*time.Hour)

	_, err := service.Signin(context.Background(), SigninInput{
		Email:    "missing@example.com",
		Password: "wrong",
	})
	if !errors.Is(err, ErrInvalidCredentials) {
		t.Fatalf("Signin() error = %v, want %v", err, ErrInvalidCredentials)
	}
}

func TestServiceRefresh(t *testing.T) {
	t.Parallel()

	userID := uuid.New()
	projectID := uuid.New()
	store := newFakeAuthStore()
	store.membershipByUser[userID] = db.ProjectMembership{
		ID:        uuid.New(),
		ProjectID: projectID,
		UserID:    userID,
		Role:      "owner",
		CreatedAt: pgtype.Timestamptz{Time: time.Now().UTC(), Valid: true},
		UpdatedAt: pgtype.Timestamptz{Time: time.Now().UTC(), Valid: true},
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
	if result.ProjectID != projectID {
		t.Fatalf("ProjectID = %s, want %s", result.ProjectID, projectID)
	}
	if len(store.refreshByHash) != 1 {
		t.Fatalf("refresh token count = %d, want 1 after rotation", len(store.refreshByHash))
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

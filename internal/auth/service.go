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
	ErrProjectMembershipNotFound = errors.New("project membership not found")
)

type authStore interface {
	CreateUser(context.Context, db.CreateUserParams) error
	GetUserByEmail(context.Context, string) (db.User, error)
	CreateProject(context.Context, db.CreateProjectParams) error
	CreateProjectMembership(context.Context, db.CreateProjectMembershipParams) error
	GetFirstProjectMembershipByUser(context.Context, uuid.UUID) (db.ProjectMembership, error)
	CreateAPIKey(context.Context, db.CreateAPIKeyParams) error
	CreateRefreshToken(context.Context, db.CreateRefreshTokenParams) error
	GetRefreshTokenByHash(context.Context, string) (db.RefreshToken, error)
	DeleteRefreshTokenByHash(context.Context, string) error
}

type Service struct {
	store      authStore
	jwtManager *JWTManager
	now        func() time.Time
	refreshTTL time.Duration
}

type SignupInput struct {
	Email       string
	Password    string
	ProjectName string
	APIKeyName  string
}

type SignupResult struct {
	UserID       uuid.UUID `json:"user_id"`
	ProjectID    uuid.UUID `json:"project_id"`
	Role         string    `json:"role"`
	APIKey       string    `json:"api_key"`
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
}

type SigninInput struct {
	Email    string
	Password string
}

type SigninResult struct {
	UserID       uuid.UUID `json:"user_id"`
	ProjectID    uuid.UUID `json:"project_id"`
	Role         string    `json:"role"`
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
}

type RefreshInput struct {
	RefreshToken string
}

type RefreshResult struct {
	UserID       uuid.UUID `json:"user_id"`
	ProjectID    uuid.UUID `json:"project_id"`
	Role         string    `json:"role"`
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
}

type LogoutInput struct {
	RefreshToken string
}

func NewService(store authStore, jwtManager *JWTManager, refreshTTL time.Duration) *Service {
	return &Service{
		store:      store,
		jwtManager: jwtManager,
		now:        time.Now,
		refreshTTL: refreshTTL,
	}
}

func (s *Service) Signup(ctx context.Context, input SignupInput) (*SignupResult, error) {
	email := strings.ToLower(strings.TrimSpace(input.Email))
	password := strings.TrimSpace(input.Password)
	projectName := strings.TrimSpace(input.ProjectName)
	apiKeyName := strings.TrimSpace(input.APIKeyName)
	if email == "" || password == "" || projectName == "" {
		return nil, fmt.Errorf("email, password, and project name are required")
	}
	if apiKeyName == "" {
		apiKeyName = "Default API Key"
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

	passwordHash, err := HashPassword(password)
	if err != nil {
		return nil, err
	}
	if err := s.store.CreateUser(ctx, db.CreateUserParams{
		ID:           userID,
		Email:        email,
		PasswordHash: passwordHash,
		CreatedAt:    nowTs,
		UpdatedAt:    nowTs,
	}); err != nil {
		return nil, err
	}

	if err := s.store.CreateProject(ctx, db.CreateProjectParams{
		ID:        projectID,
		Name:      projectName,
		CreatedAt: nowTs,
		UpdatedAt: nowTs,
	}); err != nil {
		return nil, err
	}

	role := "owner"
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

	rawAPIKey, apiKeyHash, err := s.issueAPIKey(ctx, projectID, apiKeyName, nowTs)
	if err != nil {
		return nil, err
	}

	accessToken, refreshToken, err := s.issueSession(ctx, userID, projectID, role, nowTs)
	if err != nil {
		return nil, err
	}

	_ = apiKeyHash

	return &SignupResult{
		UserID:       userID,
		ProjectID:    projectID,
		Role:         role,
		APIKey:       rawAPIKey,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
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
	accessToken, refreshToken, err := s.issueSession(ctx, user.ID, membership.ProjectID, membership.Role, nowTs)
	if err != nil {
		return nil, err
	}

	return &SigninResult{
		UserID:       user.ID,
		ProjectID:    membership.ProjectID,
		Role:         membership.Role,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
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
	accessToken, refreshToken, err := s.issueSession(ctx, storedToken.UserID, membership.ProjectID, membership.Role, nowTs)
	if err != nil {
		return nil, err
	}

	return &RefreshResult{
		UserID:       storedToken.UserID,
		ProjectID:    membership.ProjectID,
		Role:         membership.Role,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
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

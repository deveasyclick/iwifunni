package testutil

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"

	db "github.com/deveasyclick/iwifunni/internal/db/gen"
	apikeyutil "github.com/deveasyclick/iwifunni/internal/utils/apikey"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"golang.org/x/crypto/bcrypt"
)

// SeedUser creates a minimal test user with organization, environment, and API key.
// Returns references to the created entities and a raw API key string for auth headers.
func SeedUser(ctx context.Context, q *db.Queries) (*SeedData, error) {
	orgID := uuid.New()
	envID := uuid.New()
	userID := uuid.New()
	memberID := uuid.New()
	email := fmt.Sprintf("test-%s@example.com", randomHex(4))
	now := pgtype.Timestamptz{Time: time.Now(), Valid: true}

	// Create organization
	if _, err := q.CreateOrganization(ctx, db.CreateOrganizationParams{
		ID:        orgID,
		Name:      fmt.Sprintf("Test Org %s", randomHex(4)),
		CreatedAt: now,
		UpdatedAt: now,
	}); err != nil {
		return nil, fmt.Errorf("create org: %w", err)
	}

	// Create environment
	if _, err := q.CreateEnvironment(ctx, db.CreateEnvironmentParams{
		ID:             envID,
		OrganizationID: orgID,
		Name:           "production",
		IsDefault:      true,
		CreatedAt:      now,
		UpdatedAt:      now,
	}); err != nil {
		return nil, fmt.Errorf("create env: %w", err)
	}

	// Hash a test password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}

	// Create user (pre-verified so signin works out of the box)
	if err := q.CreateUser(ctx, db.CreateUserParams{
		ID:              userID,
		Email:           email,
		PasswordHash:    string(hashedPassword),
		EmailVerifiedAt: now,
		CreatedAt:       now,
		UpdatedAt:       now,
	}); err != nil {
		return nil, fmt.Errorf("create user: %w", err)
	}

	// Add user as org member
	if err := q.CreateOrganizationMember(ctx, db.CreateOrganizationMemberParams{
		ID:             memberID,
		OrganizationID: orgID,
		UserID:         userID,
		Role:           "admin",
		CreatedAt:      now,
	}); err != nil {
		return nil, fmt.Errorf("add org member: %w", err)
	}

	// Create API key
	rawKey, keyHash, keyPrefix, err := generateAPIKey()
	if err != nil {
		return nil, fmt.Errorf("generate api key: %w", err)
	}

	scopes := []byte(`["notifications:write"]`)
	if err := q.CreateAPIKey(ctx, db.CreateAPIKeyParams{
		ID:            uuid.New(),
		EnvironmentID: envID,
		Name:          "test-key",
		KeyPrefix:     keyPrefix,
		KeyHash:       keyHash,
		Scopes:        scopes,
		Status:        "active",
		CreatedAt:     now,
		UpdatedAt:     now,
	}); err != nil {
		return nil, fmt.Errorf("create api key: %w", err)
	}

	return &SeedData{
		UserID:        userID,
		OrgID:         orgID,
		EnvironmentID: envID,
		RawAPIKey:     rawKey,
		Email:         email,
		Password:      "password123",
	}, nil
}

// SeedData holds references to created test entities.
type SeedData struct {
	UserID        uuid.UUID
	OrgID         uuid.UUID
	EnvironmentID uuid.UUID
	RawAPIKey     string
	Email         string
	Password      string
}

func generateAPIKey() (rawKey, keyHash, keyPrefix string, err error) {
	rawKey, err = apikeyutil.GenerateAPIKey()
	if err != nil {
		return "", "", "", err
	}
	keyPrefix, err = apikeyutil.APIKeyPrefix(rawKey)
	if err != nil {
		return "", "", "", err
	}
	keyHash, err = apikeyutil.HashAPIKeySecret(rawKey)
	if err != nil {
		return "", "", "", err
	}
	return rawKey, keyHash, keyPrefix, nil
}

func randomHex(n int) string {
	b := make([]byte, n)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

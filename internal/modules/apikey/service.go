package apikey

import (
	"context"
	"encoding/json"
	"time"

	"github.com/deveasyclick/iwifunni/internal/db/gen"
	apikeyutil "github.com/deveasyclick/iwifunni/internal/utils/apikey"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

// Service handles API key business logic.
type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

type APIKeyResult struct {
	ID         uuid.UUID
	Name       string
	KeyPrefix  string
	LastUsedAt *time.Time
	CreatedAt  time.Time
	Key        string // only set on creation
}

func (s *Service) Create(ctx context.Context, environmentID uuid.UUID, name string) (APIKeyResult, error) {
	scopes := []string{"notifications:write"}
	rawKey, err := apikeyutil.GenerateProjectAPIKey("live")
	if err != nil {
		return APIKeyResult{}, err
	}
	prefix, err := apikeyutil.APIKeyPrefix(rawKey)
	if err != nil {
		return APIKeyResult{}, err
	}
	hash, err := apikeyutil.HashAPIKeySecret(rawKey)
	if err != nil {
		return APIKeyResult{}, err
	}
	scopesJSON, err := json.Marshal(scopes)
	if err != nil {
		return APIKeyResult{}, err
	}
	now := time.Now().UTC()
	keyID := uuid.New()
	if err := s.repo.Create(ctx, db.CreateAPIKeyParams{
		ID:            keyID,
		EnvironmentID: environmentID,
		Name:          name,
		KeyPrefix:     prefix,
		KeyHash:       hash,
		Scopes:        scopesJSON,
		Status:        "active",
		CreatedAt:     pgtype.Timestamptz{Time: now, Valid: true},
		UpdatedAt:     pgtype.Timestamptz{Time: now, Valid: true},
	}); err != nil {
		return APIKeyResult{}, err
	}
	return APIKeyResult{ID: keyID, Name: name, KeyPrefix: prefix, CreatedAt: now, Key: rawKey}, nil
}

func (s *Service) List(ctx context.Context, environmentID uuid.UUID) ([]APIKeyResult, error) {
	rows, err := s.repo.ListByEnvironment(ctx, environmentID)
	if err != nil {
		return nil, err
	}
	out := make([]APIKeyResult, 0, len(rows))
	for _, k := range rows {
		var lastUsed *time.Time
		if k.LastUsedAt.Valid {
			lastUsed = &k.LastUsedAt.Time
		}
		out = append(out, APIKeyResult{ID: k.ID, Name: k.Name, KeyPrefix: k.KeyPrefix, LastUsedAt: lastUsed, CreatedAt: k.CreatedAt.Time})
	}
	return out, nil
}

func (s *Service) Delete(ctx context.Context, environmentID, keyID uuid.UUID) error {
	keys, err := s.repo.ListByEnvironment(ctx, environmentID)
	if err != nil {
		return err
	}

	found := false
	for _, k := range keys {
		if k.ID == keyID {
			found = true
			break
		}
	}
	if !found {
		return &notFoundError{id: keyID}
	}

	return s.repo.Delete(ctx, keyID)
}

type notFoundError struct{ id uuid.UUID }

func (e *notFoundError) Error() string { return "not found: " + e.id.String() }

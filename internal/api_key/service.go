package apikey

import (
	"context"
	"encoding/json"
	"time"

	"github.com/deveasyclick/iwifunni/internal/auth"
	"github.com/deveasyclick/iwifunni/internal/db"
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
	ID        uuid.UUID
	Name      string
	KeyPrefix string
	Scopes    []string
	Status    string
	CreatedAt time.Time
	Key       string // only set on creation/rotation
}

func (s *Service) Create(ctx context.Context, projectID uuid.UUID, name string, scopes []string) (APIKeyResult, error) {
	if len(scopes) == 0 {
		scopes = []string{"notifications:write"}
	}
	rawKey, err := auth.GenerateProjectAPIKey("live")
	if err != nil {
		return APIKeyResult{}, err
	}
	prefix, err := auth.APIKeyPrefix(rawKey)
	if err != nil {
		return APIKeyResult{}, err
	}
	hash, err := auth.HashAPIKeySecret(rawKey)
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
		ID:        keyID,
		ProjectID: projectID,
		Name:      name,
		KeyPrefix: prefix,
		KeyHash:   hash,
		Scopes:    scopesJSON,
		Status:    "active",
		CreatedAt: pgtype.Timestamptz{Time: now, Valid: true},
		UpdatedAt: pgtype.Timestamptz{Time: now, Valid: true},
	}); err != nil {
		return APIKeyResult{}, err
	}
	return APIKeyResult{ID: keyID, Name: name, KeyPrefix: prefix, Scopes: scopes, Status: "active", CreatedAt: now, Key: rawKey}, nil
}

func (s *Service) List(ctx context.Context, projectID uuid.UUID) ([]APIKeyResult, error) {
	rows, err := s.repo.ListByProject(ctx, projectID)
	if err != nil {
		return nil, err
	}
	out := make([]APIKeyResult, 0, len(rows))
	for _, k := range rows {
		var scopes []string
		_ = json.Unmarshal(k.Scopes, &scopes)
		out = append(out, APIKeyResult{ID: k.ID, Name: k.Name, KeyPrefix: k.KeyPrefix, Scopes: scopes, Status: k.Status, CreatedAt: k.CreatedAt.Time})
	}
	return out, nil
}

func (s *Service) Revoke(ctx context.Context, keyID uuid.UUID) error {
	now := time.Now().UTC()
	ts := pgtype.Timestamptz{Time: now, Valid: true}
	return s.repo.UpdateStatus(ctx, keyID, "revoked", ts, ts)
}

func (s *Service) Rotate(ctx context.Context, projectID, keyID uuid.UUID) (APIKeyResult, error) {
	// List keys and find the one being rotated to get name/scopes
	keys, err := s.repo.ListByProject(ctx, projectID)
	if err != nil {
		return APIKeyResult{}, err
	}
	var old db.ApiKey
	found := false
	for _, k := range keys {
		if k.ID == keyID {
			old = k
			found = true
			break
		}
	}
	if !found {
		return APIKeyResult{}, &notFoundError{id: keyID}
	}

	// Revoke old key
	now := time.Now().UTC()
	ts := pgtype.Timestamptz{Time: now, Valid: true}
	if err := s.repo.UpdateStatus(ctx, keyID, "revoked", ts, ts); err != nil {
		return APIKeyResult{}, err
	}

	// Create new key with same name/scopes
	rawKey, err := auth.GenerateProjectAPIKey("live")
	if err != nil {
		return APIKeyResult{}, err
	}
	prefix, err := auth.APIKeyPrefix(rawKey)
	if err != nil {
		return APIKeyResult{}, err
	}
	hash, err := auth.HashAPIKeySecret(rawKey)
	if err != nil {
		return APIKeyResult{}, err
	}
	newKeyID := uuid.New()
	if err := s.repo.Create(ctx, db.CreateAPIKeyParams{
		ID:          newKeyID,
		ProjectID:   projectID,
		Name:        old.Name,
		KeyPrefix:   prefix,
		KeyHash:     hash,
		Scopes:      old.Scopes,
		Status:      "active",
		RotatedFrom: pgtype.UUID{Bytes: keyID, Valid: true},
		CreatedAt:   ts,
		UpdatedAt:   ts,
	}); err != nil {
		return APIKeyResult{}, err
	}

	var scopes []string
	_ = json.Unmarshal(old.Scopes, &scopes)
	return APIKeyResult{ID: newKeyID, Name: old.Name, KeyPrefix: prefix, Scopes: scopes, Status: "active", CreatedAt: now, Key: rawKey}, nil
}

type notFoundError struct{ id uuid.UUID }

func (e *notFoundError) Error() string { return "not found: " + e.id.String() }

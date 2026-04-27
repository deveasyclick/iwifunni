package provider

import (
	"context"
	"encoding/json"

	"github.com/deveasyclick/iwifunni/internal/crypto"
	"github.com/deveasyclick/iwifunni/internal/db"
	"github.com/google/uuid"
)

// Service handles provider business logic including credential encryption.
type Service struct {
	repo          *Repository
	encryptionKey string
}

func NewService(repo *Repository, encryptionKey string) *Service {
	return &Service{repo: repo, encryptionKey: encryptionKey}
}

type CreateInput struct {
	ProjectID   uuid.UUID
	Name        string
	Channel     string
	Credentials map[string]any
	Config      map[string]any
}

type UpdateInput struct {
	ID          uuid.UUID
	ProjectID   uuid.UUID
	Name        string
	Channel     string
	Credentials map[string]any
	Config      map[string]any
}

func (s *Service) Create(ctx context.Context, in CreateInput) (db.Provider, error) {
	credJSON, err := json.Marshal(in.Credentials)
	if err != nil {
		return db.Provider{}, err
	}
	encCreds, err := crypto.Encrypt(credJSON, s.encryptionKey)
	if err != nil {
		return db.Provider{}, err
	}
	var configJSON []byte
	if in.Config != nil {
		configJSON, err = json.Marshal(in.Config)
		if err != nil {
			return db.Provider{}, err
		}
	}
	return s.repo.Create(ctx, db.CreateProviderParams{
		ID:          uuid.New(),
		ProjectID:   in.ProjectID,
		Name:        in.Name,
		Channel:     in.Channel,
		Credentials: []byte(`"` + encCreds + `"`),
		Config:      configJSON,
	})
}

func (s *Service) GetByID(ctx context.Context, id, projectID uuid.UUID) (db.Provider, error) {
	return s.repo.GetByID(ctx, id, projectID)
}

func (s *Service) List(ctx context.Context, projectID uuid.UUID) ([]db.Provider, error) {
	return s.repo.List(ctx, projectID)
}

func (s *Service) Update(ctx context.Context, in UpdateInput) (db.Provider, error) {
	credJSON, err := json.Marshal(in.Credentials)
	if err != nil {
		return db.Provider{}, err
	}
	encCreds, err := crypto.Encrypt(credJSON, s.encryptionKey)
	if err != nil {
		return db.Provider{}, err
	}
	var configJSON []byte
	if in.Config != nil {
		configJSON, err = json.Marshal(in.Config)
		if err != nil {
			return db.Provider{}, err
		}
	}
	return s.repo.Update(ctx, db.UpdateProviderParams{
		ID:          in.ID,
		ProjectID:   in.ProjectID,
		Name:        in.Name,
		Channel:     in.Channel,
		Credentials: []byte(`"` + encCreds + `"`),
		Config:      configJSON,
	})
}

func (s *Service) Delete(ctx context.Context, id, projectID uuid.UUID) error {
	return s.repo.Delete(ctx, id, projectID)
}

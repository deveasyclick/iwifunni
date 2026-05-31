package provider

import (
	"context"
	"errors"
	"strings"

	"github.com/deveasyclick/iwifunni/internal/crypto"
	"github.com/deveasyclick/iwifunni/internal/db"
	"github.com/deveasyclick/iwifunni/internal/providers/catalog"
	"github.com/deveasyclick/iwifunni/internal/providers/defaults"
	"github.com/google/uuid"
)

var ErrUnsupportedProvider = errors.New("unsupported provider")

// Service handles provider business logic including credential encryption.
type Service struct {
	repo          *Repository
	encryptionKey string
	catalog       *catalog.Catalog
}

func NewService(repo *Repository, encryptionKey string) *Service {
	return &Service{repo: repo, encryptionKey: encryptionKey, catalog: defaults.NewCatalog()}
}

type CreateInput struct {
	EnvironmentID uuid.UUID
	Name          string
	Channel       string
	Credentials   map[string]any
	Config        map[string]any
}

type UpdateInput struct {
	ID            uuid.UUID
	EnvironmentID uuid.UUID
	Name          string
	Channel       string
	Credentials   map[string]any
	Config        map[string]any
}

func (s *Service) Create(ctx context.Context, in CreateInput) (db.Provider, error) {
	name, channel, credJSON, configJSON, err := s.prepareProviderInput(in.Name, in.Channel, in.Credentials, in.Config, nil)
	if err != nil {
		return db.Provider{}, err
	}
	encCreds, err := crypto.Encrypt(credJSON, s.encryptionKey)
	if err != nil {
		return db.Provider{}, err
	}
	return s.repo.Create(ctx, db.CreateProviderParams{
		ID:            uuid.New(),
		EnvironmentID: in.EnvironmentID,
		Name:          name,
		Channel:       channel,
		Credentials:   []byte(`"` + encCreds + `"`),
		Config:        configJSON,
	})
}

func (s *Service) GetByID(ctx context.Context, id, environmentID uuid.UUID) (db.Provider, error) {
	return s.repo.GetByID(ctx, id, environmentID)
}

func (s *Service) List(ctx context.Context, environmentID uuid.UUID) ([]db.Provider, error) {
	return s.repo.List(ctx, environmentID)
}

func (s *Service) Update(ctx context.Context, in UpdateInput) (db.Provider, error) {
	current, err := s.repo.GetByID(ctx, in.ID, in.EnvironmentID)
	if err != nil {
		return db.Provider{}, err
	}
	name, channel, credJSON, configJSON, err := s.prepareProviderInput(in.Name, in.Channel, in.Credentials, in.Config, &current)
	if err != nil {
		return db.Provider{}, err
	}
	credentials := current.Credentials
	if credJSON != nil {
		encCreds, encErr := crypto.Encrypt(credJSON, s.encryptionKey)
		if encErr != nil {
			return db.Provider{}, encErr
		}
		credentials = []byte(`"` + encCreds + `"`)
	}
	return s.repo.Update(ctx, db.UpdateProviderParams{
		ID:            in.ID,
		EnvironmentID: in.EnvironmentID,
		Name:          name,
		Channel:       channel,
		Credentials:   credentials,
		Config:        configJSON,
	})
}

func (s *Service) Delete(ctx context.Context, id, environmentID uuid.UUID) error {
	return s.repo.Delete(ctx, id, environmentID)
}

func (s *Service) prepareProviderInput(name, channel string, credentials, config map[string]any, current *db.Provider) (string, string, []byte, []byte, error) {
	if s.catalog == nil {
		s.catalog = defaults.NewCatalog()
	}

	normalizedName := strings.ToLower(strings.TrimSpace(name))
	definition, ok := s.catalog.Get(normalizedName)
	if !ok {
		return "", "", nil, nil, errUnsupportedProvider(normalizedName)
	}

	normalizedChannel := strings.ToLower(strings.TrimSpace(channel))
	if definition.Channel() != normalizedChannel {
		return "", "", nil, nil, errUnsupportedProvider(normalizedName)
	}

	var stored *catalog.StoredInput
	if current != nil {
		stored = &catalog.StoredInput{
			Credentials: current.Credentials,
			Config:      current.Config,
		}
	}

	normalized, err := definition.Normalize(credentials, config, stored)
	if err != nil {
		return "", "", nil, nil, err
	}

	return normalized.Name, normalized.Channel, normalized.CredentialsJSON, normalized.ConfigJSON, nil
}

func errUnsupportedProvider(name string) error {
	return &unsupportedProviderError{name: name}
}

type unsupportedProviderError struct {
	name string
}

func (e *unsupportedProviderError) Error() string {
	if e.name == "" {
		return "unsupported provider"
	}
	return "unsupported provider: " + e.name
}

func (e *unsupportedProviderError) Unwrap() error {
	return ErrUnsupportedProvider
}

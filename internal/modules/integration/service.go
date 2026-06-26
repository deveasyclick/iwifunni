package integration

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/deveasyclick/iwifunni/internal/db/gen"
	"github.com/deveasyclick/iwifunni/internal/providers"
	"github.com/deveasyclick/iwifunni/internal/providers/catalog"
	"github.com/deveasyclick/iwifunni/internal/utils/crypto"
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
	return &Service{repo: repo, encryptionKey: encryptionKey, catalog: providers.NewCatalog()}
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

func (s *Service) Create(ctx context.Context, in CreateInput) (db.Integration, error) {
	name, channel, credJSON, configJSON, err := s.prepareProviderInput(in.Name, in.Channel, in.Credentials, in.Config, nil)
	if err != nil {
		return db.Integration{}, err
	}

	var credentials []byte
	if len(credJSON) > 0 {
		encCreds, encErr := crypto.Encrypt(credJSON, s.encryptionKey)
		if encErr != nil {
			return db.Integration{}, encErr
		}
		credentials = []byte(`"` + encCreds + `"`)
	}

	// Only set active+primary if no other active provider exists for this channel yet.
	existing, err := s.repo.ListByChannel(ctx, in.EnvironmentID, channel)
	if err != nil {
		return db.Integration{}, err
	}
	hasActive := false
	for _, p := range existing {
		if p.IsActive {
			hasActive = true
			break
		}
	}
	isActive := !hasActive
	isPrimary := !hasActive

	return s.repo.Create(ctx, db.CreateIntegrationParams{
		ID:            uuid.New(),
		EnvironmentID: in.EnvironmentID,
		Name:          name,
		Channel:       channel,
		Credentials:   credentials,
		Config:        configJSON,
		IsActive:      isActive,
		IsPrimary:     isPrimary,
	})
}

func (s *Service) GetByID(ctx context.Context, id, environmentID uuid.UUID) (db.Integration, error) {
	return s.repo.GetByID(ctx, id, environmentID)
}

func (s *Service) List(ctx context.Context, environmentID uuid.UUID) ([]db.Integration, error) {
	return s.repo.List(ctx, environmentID)
}

func (s *Service) Update(ctx context.Context, in UpdateInput) (db.Integration, error) {
	current, err := s.repo.GetByID(ctx, in.ID, in.EnvironmentID)
	if err != nil {
		return db.Integration{}, err
	}
	name, channel, credJSON, configJSON, err := s.prepareProviderInput(in.Name, in.Channel, in.Credentials, in.Config, &current)
	if err != nil {
		return db.Integration{}, err
	}
	credentials := current.Credentials
	if credJSON != nil {
		encCreds, encErr := crypto.Encrypt(credJSON, s.encryptionKey)
		if encErr != nil {
			return db.Integration{}, encErr
		}
		credentials = []byte(`"` + encCreds + `"`)
	}
	return s.repo.Update(ctx, db.UpdateIntegrationParams{
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

func (s *Service) prepareProviderInput(name, channel string, credentials, config map[string]any, current *db.Integration) (string, string, []byte, []byte, error) {
	if s.catalog == nil {
		s.catalog = providers.NewCatalog()
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

// StateAction represents the action to perform on a provider's state.
type StateAction string

const (
	ActionEnable     StateAction = "enable"
	ActionDisable    StateAction = "disable"
	ActionSetPrimary StateAction = "set_primary"
)

// StateInput carries the parameters for a provider state transition.
type StateInput struct {
	ID            uuid.UUID
	EnvironmentID uuid.UUID
	Action        StateAction
}

// UpdateState performs enable, disable, or set_primary on a provider,
// enforcing all primary-per-channel rules inside a single transaction.
func (s *Service) UpdateState(ctx context.Context, in StateInput) (db.Integration, error) {
	var result db.Integration
	err := s.repo.WithinTx(ctx, func(repo *Repository) error {
		p, err := repo.GetByID(ctx, in.ID, in.EnvironmentID)
		if err != nil {
			return err
		}
		switch in.Action {
		case ActionEnable:
			result, err = s.enable(ctx, repo, p)
		case ActionDisable:
			result, err = s.disable(ctx, repo, p)
		case ActionSetPrimary:
			result, err = s.setPrimary(ctx, repo, p)
		default:
			return fmt.Errorf("unknown action: %s", in.Action)
		}
		return err
	})
	return result, err
}

func (s *Service) enable(ctx context.Context, repo *Repository, p db.Integration) (db.Integration, error) {
	return repo.UpdateState(ctx, db.UpdateIntegrationStateParams{
		ID:            p.ID,
		EnvironmentID: p.EnvironmentID,
		IsActive:      true,
		IsPrimary:     p.IsPrimary,
	})
}

func (s *Service) disable(ctx context.Context, repo *Repository, p db.Integration) (db.Integration, error) {
	if p.IsPrimary {
		// Try to promote another active provider to primary before disabling.
		promoted, err := s.promotePrimary(ctx, repo, p)
		if err != nil {
			return db.Integration{}, errors.New("cannot disable primary provider: no fallback active provider available")
		}
		_ = promoted
	}
	return repo.UpdateState(ctx, db.UpdateIntegrationStateParams{
		ID:            p.ID,
		EnvironmentID: p.EnvironmentID,
		IsActive:      false,
		IsPrimary:     false,
	})
}

func (s *Service) setPrimary(ctx context.Context, repo *Repository, p db.Integration) (db.Integration, error) {
	// Clear existing primary for this channel.
	if err := repo.ClearPrimaryByChannel(ctx, p.EnvironmentID, p.Channel); err != nil {
		return db.Integration{}, err
	}
	// Enable and mark as primary.
	return repo.UpdateState(ctx, db.UpdateIntegrationStateParams{
		ID:            p.ID,
		EnvironmentID: p.EnvironmentID,
		IsActive:      true,
		IsPrimary:     true,
	})
}

// promotePrimary finds another active non-primary provider in the same channel and sets it as primary.
func (s *Service) promotePrimary(ctx context.Context, repo *Repository, exclude db.Integration) (db.Integration, error) {
	providers, err := repo.ListByChannel(ctx, exclude.EnvironmentID, exclude.Channel)
	if err != nil {
		return db.Integration{}, err
	}
	for _, candidate := range providers {
		if candidate.ID == exclude.ID || !candidate.IsActive {
			continue
		}
		// Clear existing primary first, then promote.
		if err := repo.ClearPrimaryByChannel(ctx, exclude.EnvironmentID, exclude.Channel); err != nil {
			return db.Integration{}, err
		}
		return repo.UpdateState(ctx, db.UpdateIntegrationStateParams{
			ID:            candidate.ID,
			EnvironmentID: candidate.EnvironmentID,
			IsActive:      true,
			IsPrimary:     true,
		})
	}
	return db.Integration{}, errors.New("no eligible fallback provider")
}

package workflow

import (
	"context"
	"encoding/json"
	"errors"
	"regexp"
	"strings"

	"github.com/deveasyclick/iwifunni/internal/db"
	"github.com/google/uuid"
)

var (
	ErrInvalidWorkflow = errors.New("invalid workflow")
	workflowKeyPattern = regexp.MustCompile(`^[a-zA-Z0-9_-]+$`)
)

type CreateInput struct {
	EnvironmentID uuid.UUID
	Key         string
	Name        string
	Description *string
	Channels    []string
	TemplateIDs map[string]string
}

type UpdateInput struct {
	ID          uuid.UUID
	EnvironmentID uuid.UUID
	Key         string
	Name        string
	Description *string
	Channels    []string
	TemplateIDs map[string]string
	IsActive    bool
}

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) Create(ctx context.Context, in CreateInput) (db.Workflow, error) {
	params, err := buildCreateParams(in)
	if err != nil {
		return db.Workflow{}, err
	}
	return s.repo.Create(ctx, params)
}

func (s *Service) List(ctx context.Context, environmentID uuid.UUID) ([]db.Workflow, error) {
	return s.repo.List(ctx, environmentID)
}

func (s *Service) GetByID(ctx context.Context, id, environmentID uuid.UUID) (db.Workflow, error) {
	return s.repo.GetByID(ctx, id, environmentID)
}

func (s *Service) Update(ctx context.Context, in UpdateInput) (db.Workflow, error) {
	params, err := buildUpdateParams(in)
	if err != nil {
		return db.Workflow{}, err
	}
	return s.repo.Update(ctx, params)
}

func (s *Service) Delete(ctx context.Context, id, environmentID uuid.UUID) error {
	return s.repo.Delete(ctx, id, environmentID)
}

func buildCreateParams(in CreateInput) (db.CreateWorkflowParams, error) {
	key, name, description, channels, templateIDs, err := normalizeWorkflowInput(in.Key, in.Name, in.Description, in.Channels, in.TemplateIDs)
	if err != nil {
		return db.CreateWorkflowParams{}, err
	}
	return db.CreateWorkflowParams{
		ID:            uuid.New(),
		EnvironmentID: in.EnvironmentID,
		Key:           key,
		Name:          name,
		Description:   description,
		Channels:      channels,
		TemplateIds:   templateIDs,
	}, nil
}

func buildUpdateParams(in UpdateInput) (db.UpdateWorkflowParams, error) {
	key, name, description, channels, templateIDs, err := normalizeWorkflowInput(in.Key, in.Name, in.Description, in.Channels, in.TemplateIDs)
	if err != nil {
		return db.UpdateWorkflowParams{}, err
	}
	return db.UpdateWorkflowParams{
		ID:            in.ID,
		EnvironmentID: in.EnvironmentID,
		Key:           key,
		Name:          name,
		Description:   description,
		Channels:      channels,
		TemplateIds:   templateIDs,
		IsActive:      in.IsActive,
	}, nil
}

func normalizeWorkflowInput(key, name string, description *string, channels []string, templateIDs map[string]string) (string, string, *string, []string, []byte, error) {
	normalizedKey := strings.TrimSpace(key)
	normalizedName := strings.TrimSpace(name)
	if normalizedKey == "" || normalizedName == "" || !workflowKeyPattern.MatchString(normalizedKey) {
		return "", "", nil, nil, nil, ErrInvalidWorkflow
	}
	normalizedChannels, err := normalizeChannels(channels)
	if err != nil {
		return "", "", nil, nil, nil, err
	}
	normalizedDescription := trimOptional(description)
	normalizedTemplateIDs, err := normalizeTemplateIDs(templateIDs, normalizedChannels)
	if err != nil {
		return "", "", nil, nil, nil, err
	}
	return normalizedKey, normalizedName, normalizedDescription, normalizedChannels, normalizedTemplateIDs, nil
}

func normalizeChannels(channels []string) ([]string, error) {
	if len(channels) == 0 {
		return nil, ErrInvalidWorkflow
	}
	seen := make(map[string]struct{}, len(channels))
	result := make([]string, 0, len(channels))
	for _, channel := range channels {
		normalized := strings.ToLower(strings.TrimSpace(channel))
		switch normalized {
		case "email", "sms", "push":
		default:
			return nil, ErrInvalidWorkflow
		}
		if _, ok := seen[normalized]; ok {
			continue
		}
		seen[normalized] = struct{}{}
		result = append(result, normalized)
	}
	if len(result) == 0 {
		return nil, ErrInvalidWorkflow
	}
	return result, nil
}

func normalizeTemplateIDs(templateIDs map[string]string, channels []string) ([]byte, error) {
	allowed := make(map[string]struct{}, len(channels))
	for _, channel := range channels {
		allowed[channel] = struct{}{}
	}
	normalized := make(map[string]string, len(templateIDs))
	for channel, templateID := range templateIDs {
		normalizedChannel := strings.ToLower(strings.TrimSpace(channel))
		if _, ok := allowed[normalizedChannel]; !ok {
			return nil, ErrInvalidWorkflow
		}
		normalizedTemplateID := strings.TrimSpace(templateID)
		if normalizedTemplateID == "" {
			continue
		}
		if _, err := uuid.Parse(normalizedTemplateID); err != nil {
			return nil, ErrInvalidWorkflow
		}
		normalized[normalizedChannel] = normalizedTemplateID
	}
	if normalized == nil {
		normalized = map[string]string{}
	}
	return json.Marshal(normalized)
}

func trimOptional(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

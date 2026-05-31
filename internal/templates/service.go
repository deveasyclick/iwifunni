package templates

import (
	"context"

	"github.com/deveasyclick/iwifunni/internal/db"
	"github.com/google/uuid"
)

// Service handles template business logic.
type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

type CreateInput struct {
	EnvironmentID uuid.UUID
	Name      string
	Channel   string
	Subject   *string
	Body      string
}

type UpdateInput struct {
	ID        uuid.UUID
	EnvironmentID uuid.UUID
	Subject   *string
	Body      string
}

func (s *Service) Create(ctx context.Context, in CreateInput) (db.Template, error) {
	return s.repo.Create(ctx, db.CreateTemplateParams{
		ID:            uuid.New(),
		EnvironmentID: in.EnvironmentID,
		Name:          in.Name,
		Channel:       in.Channel,
		Subject:       in.Subject,
		Body:          in.Body,
	})
}

func (s *Service) GetByID(ctx context.Context, id, environmentID uuid.UUID) (db.Template, error) {
	return s.repo.GetByID(ctx, id, environmentID)
}

func (s *Service) List(ctx context.Context, environmentID uuid.UUID) ([]db.Template, error) {
	return s.repo.List(ctx, environmentID)
}

func (s *Service) Update(ctx context.Context, in UpdateInput) (db.Template, error) {
	return s.repo.Update(ctx, db.UpdateTemplateParams{
		ID:            in.ID,
		EnvironmentID: in.EnvironmentID,
		Subject:       in.Subject,
		Body:          in.Body,
	})
}

func (s *Service) Delete(ctx context.Context, id, environmentID uuid.UUID) error {
	return s.repo.Delete(ctx, id, environmentID)
}

func (s *Service) Render(subject, body string, vars map[string]any) (RenderedTemplate, error) {
	return Render(subject, body, vars)
}

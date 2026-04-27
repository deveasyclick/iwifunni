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
	ProjectID uuid.UUID
	Name      string
	Channel   string
	Subject   *string
	Body      string
}

type UpdateInput struct {
	ID        uuid.UUID
	ProjectID uuid.UUID
	Subject   *string
	Body      string
}

func (s *Service) Create(ctx context.Context, in CreateInput) (db.Template, error) {
	return s.repo.Create(ctx, db.CreateTemplateParams{
		ID:        uuid.New(),
		ProjectID: in.ProjectID,
		Name:      in.Name,
		Channel:   in.Channel,
		Subject:   in.Subject,
		Body:      in.Body,
	})
}

func (s *Service) GetByID(ctx context.Context, id, projectID uuid.UUID) (db.Template, error) {
	return s.repo.GetByID(ctx, id, projectID)
}

func (s *Service) List(ctx context.Context, projectID uuid.UUID) ([]db.Template, error) {
	return s.repo.List(ctx, projectID)
}

func (s *Service) Update(ctx context.Context, in UpdateInput) (db.Template, error) {
	return s.repo.Update(ctx, db.UpdateTemplateParams{
		ID:        in.ID,
		ProjectID: in.ProjectID,
		Subject:   in.Subject,
		Body:      in.Body,
	})
}

func (s *Service) Delete(ctx context.Context, id, projectID uuid.UUID) error {
	return s.repo.Delete(ctx, id, projectID)
}

func (s *Service) Render(subject, body string, vars map[string]any) (RenderedTemplate, error) {
	return Render(subject, body, vars)
}

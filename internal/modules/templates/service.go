package templates

import (
	"context"

	"github.com/deveasyclick/iwifunni/internal/db/gen"
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

func (s *Service) GetByID(ctx context.Context, id, environmentID uuid.UUID) (db.Template, error) {
	return s.repo.GetByID(ctx, id, environmentID)
}

func (s *Service) Update(ctx context.Context, in UpdateInput) (db.Template, error) {
	return s.repo.Update(ctx, db.UpdateTemplateParams{
		ID:            in.ID,
		EnvironmentID: in.EnvironmentID,
		Subject:       in.Subject,
		Body:          in.Body,
	})
}

// Upsert creates a new template or updates the existing one with the same name + channel.
func (s *Service) Upsert(ctx context.Context, in CreateInput) (db.Template, error) {
	return s.repo.Upsert(ctx, db.UpsertTemplateParams{
		ID:            uuid.New(),
		EnvironmentID: in.EnvironmentID,
		Name:          in.Name,
		Channel:       in.Channel,
		Subject:       in.Subject,
		Body:          in.Body,
	})
}

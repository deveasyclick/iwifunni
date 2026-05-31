package templates

import (
	"context"

	"github.com/deveasyclick/iwifunni/internal/db"
	"github.com/google/uuid"
)

type Repository struct {
	q *db.Queries
}

func NewRepository(q *db.Queries) *Repository {
	return &Repository{q: q}
}

func (r *Repository) Create(ctx context.Context, arg db.CreateTemplateParams) (db.Template, error) {
	return r.q.CreateTemplate(ctx, arg)
}

func (r *Repository) GetByID(ctx context.Context, id, environmentID uuid.UUID) (db.Template, error) {
	return r.q.GetTemplateByID(ctx, db.GetTemplateByIDParams{ID: id, EnvironmentID: environmentID})
}

func (r *Repository) List(ctx context.Context, environmentID uuid.UUID) ([]db.Template, error) {
	return r.q.ListTemplates(ctx, environmentID)
}

func (r *Repository) Update(ctx context.Context, arg db.UpdateTemplateParams) (db.Template, error) {
	return r.q.UpdateTemplate(ctx, arg)
}

func (r *Repository) Delete(ctx context.Context, id, environmentID uuid.UUID) error {
	return r.q.DeleteTemplate(ctx, db.DeleteTemplateParams{ID: id, EnvironmentID: environmentID})
}

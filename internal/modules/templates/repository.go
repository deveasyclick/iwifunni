package templates

import (
	"context"

	"github.com/deveasyclick/iwifunni/internal/db/gen"
	"github.com/google/uuid"
)

type Repository struct {
	q *db.Queries
}

func NewRepository(q *db.Queries) *Repository {
	return &Repository{q: q}
}

func (r *Repository) Upsert(ctx context.Context, arg db.UpsertTemplateParams) (db.Template, error) {
	return r.q.UpsertTemplate(ctx, arg)
}

func (r *Repository) GetByID(ctx context.Context, id, environmentID uuid.UUID) (db.Template, error) {
	return r.q.GetTemplateByID(ctx, db.GetTemplateByIDParams{ID: id, EnvironmentID: environmentID})
}

func (r *Repository) Update(ctx context.Context, arg db.UpdateTemplateParams) (db.Template, error) {
	return r.q.UpdateTemplate(ctx, arg)
}

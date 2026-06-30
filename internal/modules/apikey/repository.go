package apikey

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

func (r *Repository) Create(ctx context.Context, arg db.CreateAPIKeyParams) error {
	return r.q.CreateAPIKey(ctx, arg)
}

func (r *Repository) ListByEnvironment(ctx context.Context, environmentID uuid.UUID) ([]db.ApiKey, error) {
	return r.q.ListAPIKeysByEnvironment(ctx, environmentID)
}

func (r *Repository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.q.DeleteAPIKey(ctx, id)
}

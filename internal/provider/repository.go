package provider

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

func (r *Repository) Create(ctx context.Context, arg db.CreateProviderParams) (db.Provider, error) {
	return r.q.CreateProvider(ctx, arg)
}

func (r *Repository) GetByID(ctx context.Context, id, environmentID uuid.UUID) (db.Provider, error) {
	return r.q.GetProviderByID(ctx, db.GetProviderByIDParams{ID: id, EnvironmentID: environmentID})
}

func (r *Repository) List(ctx context.Context, environmentID uuid.UUID) ([]db.Provider, error) {
	return r.q.ListProviders(ctx, environmentID)
}

func (r *Repository) Update(ctx context.Context, arg db.UpdateProviderParams) (db.Provider, error) {
	return r.q.UpdateProvider(ctx, arg)
}

func (r *Repository) Delete(ctx context.Context, id, environmentID uuid.UUID) error {
	return r.q.DeleteProvider(ctx, db.DeleteProviderParams{ID: id, EnvironmentID: environmentID})
}

package provider

import (
	"context"

	"github.com/deveasyclick/iwifunni/internal/db"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	q    *db.Queries
	pool *pgxpool.Pool
}

func NewRepository(q *db.Queries, pool *pgxpool.Pool) *Repository {
	return &Repository{q: q, pool: pool}
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

func (r *Repository) ListByChannel(ctx context.Context, environmentID uuid.UUID, channel string) ([]db.Provider, error) {
	return r.q.ListProvidersByChannel(ctx, db.ListProvidersByChannelParams{
		EnvironmentID: environmentID,
		Channel:       channel,
	})
}

func (r *Repository) Update(ctx context.Context, arg db.UpdateProviderParams) (db.Provider, error) {
	return r.q.UpdateProvider(ctx, arg)
}

func (r *Repository) UpdateState(ctx context.Context, arg db.UpdateProviderStateParams) (db.Provider, error) {
	return r.q.UpdateProviderState(ctx, arg)
}

func (r *Repository) ClearPrimaryByChannel(ctx context.Context, environmentID uuid.UUID, channel string) error {
	return r.q.ClearProviderPrimaryByChannel(ctx, db.ClearProviderPrimaryByChannelParams{
		EnvironmentID: environmentID,
		Channel:       channel,
	})
}

func (r *Repository) Delete(ctx context.Context, id, environmentID uuid.UUID) error {
	return r.q.DeleteProvider(ctx, db.DeleteProviderParams{ID: id, EnvironmentID: environmentID})
}

func (r *Repository) WithinTx(ctx context.Context, fn func(repo *Repository) error) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}

	txRepo := &Repository{
		q:    r.q.WithTx(tx),
		pool: r.pool,
	}

	if err := fn(txRepo); err != nil {
		_ = tx.Rollback(ctx)
		return err
	}

	return tx.Commit(ctx)
}

package integration

import (
	"context"

	"github.com/deveasyclick/iwifunni/internal/db/gen"
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

func (r *Repository) Create(ctx context.Context, arg db.CreateIntegrationParams) (db.Integration, error) {
	return r.q.CreateIntegration(ctx, arg)
}

func (r *Repository) GetByID(ctx context.Context, id, environmentID uuid.UUID) (db.Integration, error) {
	return r.q.GetIntegrationByID(ctx, db.GetIntegrationByIDParams{ID: id, EnvironmentID: environmentID})
}

func (r *Repository) List(ctx context.Context, environmentID uuid.UUID) ([]db.Integration, error) {
	return r.q.ListIntegrations(ctx, environmentID)
}

func (r *Repository) ListByChannel(ctx context.Context, environmentID uuid.UUID, channel string) ([]db.Integration, error) {
	return r.q.ListIntegrationsByChannel(ctx, db.ListIntegrationsByChannelParams{
		EnvironmentID: environmentID,
		Channel:       channel,
	})
}

func (r *Repository) Update(ctx context.Context, arg db.UpdateIntegrationParams) (db.Integration, error) {
	return r.q.UpdateIntegration(ctx, arg)
}

func (r *Repository) UpdateState(ctx context.Context, arg db.UpdateIntegrationStateParams) (db.Integration, error) {
	return r.q.UpdateIntegrationState(ctx, arg)
}

func (r *Repository) ClearPrimaryByChannel(ctx context.Context, environmentID uuid.UUID, channel string) error {
	return r.q.ClearIntegrationPrimaryByChannel(ctx, db.ClearIntegrationPrimaryByChannelParams{
		EnvironmentID: environmentID,
		Channel:       channel,
	})
}

func (r *Repository) Delete(ctx context.Context, id, environmentID uuid.UUID) error {
	return r.q.DeleteIntegration(ctx, db.DeleteIntegrationParams{ID: id, EnvironmentID: environmentID})
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

package apikey

import (
	"context"

	"github.com/deveasyclick/iwifunni/internal/db"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
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

func (r *Repository) ListByProject(ctx context.Context, projectID uuid.UUID) ([]db.ApiKey, error) {
	return r.q.ListAPIKeysByProject(ctx, projectID)
}

func (r *Repository) UpdateStatus(ctx context.Context, id uuid.UUID, status string, revokedAt, updatedAt pgtype.Timestamptz) error {
	return r.q.UpdateAPIKeyStatus(ctx, db.UpdateAPIKeyStatusParams{
		ID:        id,
		Status:    status,
		RevokedAt: revokedAt,
		UpdatedAt: updatedAt,
	})
}

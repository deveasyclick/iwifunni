package organization

import (
	"context"
	"time"

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

func (r *Repository) Create(ctx context.Context, id uuid.UUID, name string) (db.Organization, error) {
	now := pgtype.Timestamptz{Time: time.Now().UTC(), Valid: true}
	return r.q.CreateOrganization(ctx, db.CreateOrganizationParams{
		ID: id, Name: name, CreatedAt: now, UpdatedAt: now,
	})
}

func (r *Repository) GetByID(ctx context.Context, id uuid.UUID) (db.Organization, error) {
	return r.q.GetOrganizationByID(ctx, id)
}

func (r *Repository) ListByUser(ctx context.Context, userID uuid.UUID) ([]db.Organization, error) {
	return r.q.ListOrganizationsByUser(ctx, userID)
}

func (r *Repository) AddMember(ctx context.Context, arg db.CreateOrganizationMemberParams) error {
	return r.q.CreateOrganizationMember(ctx, arg)
}

func (r *Repository) GetMember(ctx context.Context, orgID, userID uuid.UUID) (db.OrganizationMember, error) {
	return r.q.GetOrganizationMember(ctx, db.GetOrganizationMemberParams{
		OrganizationID: orgID,
		UserID:         userID,
	})
}

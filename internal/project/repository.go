package project

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

func (r *Repository) Create(ctx context.Context, orgID uuid.UUID, name string) (db.Project, error) {
	now := pgtype.Timestamptz{Time: time.Now().UTC(), Valid: true}
	return r.q.CreateProjectWithOrg(ctx, db.CreateProjectWithOrgParams{
		ID:             uuid.New(),
		OrganizationID: pgtype.UUID{Bytes: orgID, Valid: true},
		Name:           name,
		CreatedAt:      now,
		UpdatedAt:      now,
	})
}

func (r *Repository) GetByID(ctx context.Context, id uuid.UUID) (db.GetProjectByIDRow, error) {
	return r.q.GetProjectByID(ctx, id)
}

func (r *Repository) ListByOrganization(ctx context.Context, orgID uuid.UUID) ([]db.ListProjectsByOrganizationRow, error) {
	return r.q.ListProjectsByOrganization(ctx, pgtype.UUID{Bytes: orgID, Valid: true})
}

func (r *Repository) AddMember(ctx context.Context, arg db.CreateProjectMembershipParams) error {
	return r.q.CreateProjectMembership(ctx, arg)
}

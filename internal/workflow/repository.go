package workflow

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

func (r *Repository) Create(ctx context.Context, arg db.CreateWorkflowParams) (db.Workflow, error) {
	return r.q.CreateWorkflow(ctx, arg)
}

func (r *Repository) List(ctx context.Context, projectID uuid.UUID) ([]db.Workflow, error) {
	return r.q.ListWorkflowsByProject(ctx, projectID)
}

func (r *Repository) GetByID(ctx context.Context, id, projectID uuid.UUID) (db.Workflow, error) {
	return r.q.GetWorkflowByID(ctx, db.GetWorkflowByIDParams{ID: id, ProjectID: projectID})
}

func (r *Repository) Update(ctx context.Context, arg db.UpdateWorkflowParams) (db.Workflow, error) {
	return r.q.UpdateWorkflow(ctx, arg)
}

func (r *Repository) Delete(ctx context.Context, id, projectID uuid.UUID) error {
	return r.q.DeleteWorkflow(ctx, db.DeleteWorkflowParams{ID: id, ProjectID: projectID})
}

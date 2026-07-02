package workflow

import (
	"context"

	db "github.com/deveasyclick/iwifunni/internal/db/gen"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

type Repository struct {
	q *db.Queries
}

func NewRepository(q *db.Queries) *Repository {
	return &Repository{q: q}
}

func (r *Repository) CreateDefinition(ctx context.Context, arg db.CreateWorkflowDefinitionParams) (db.Workflow, error) {
	return r.q.CreateWorkflowDefinition(ctx, arg)
}

func (r *Repository) GetActiveByTriggerEvent(ctx context.Context, environmentID uuid.UUID, triggerEvent string) ([]db.Workflow, error) {
	return r.q.GetActiveWorkflowsByTriggerEvent(ctx, db.GetActiveWorkflowsByTriggerEventParams{
		EnvironmentID: environmentID,
		TriggerEvent:  &triggerEvent,
	})
}

func (r *Repository) Create(ctx context.Context, arg db.CreateWorkflowParams) (db.Workflow, error) {
	return r.q.CreateWorkflow(ctx, arg)
}

func (r *Repository) CreateExecution(ctx context.Context, arg db.CreateWorkflowExecutionParams) (db.WorkflowExecution, error) {
	return r.q.CreateWorkflowExecution(ctx, arg)
}

func (r *Repository) List(ctx context.Context, environmentID uuid.UUID) ([]db.Workflow, error) {
	return r.q.ListWorkflowsByEnvironment(ctx, environmentID)
}

func (r *Repository) GetByID(ctx context.Context, id, environmentID uuid.UUID) (db.Workflow, error) {
	return r.q.GetWorkflowByID(ctx, db.GetWorkflowByIDParams{ID: id, EnvironmentID: environmentID})
}

func (r *Repository) GetWorkflowByID(ctx context.Context, id, environmentID uuid.UUID) (db.Workflow, error) {
	return r.GetByID(ctx, id, environmentID)
}

func (r *Repository) ListExecutions(ctx context.Context, environmentID uuid.UUID, workflowID *uuid.UUID) ([]db.WorkflowExecution, error) {
	if workflowID != nil {
		return r.q.ListWorkflowExecutionsByWorkflow(ctx, db.ListWorkflowExecutionsByWorkflowParams{
			WorkflowID:    *workflowID,
			EnvironmentID: environmentID,
		})
	}

	return r.q.ListWorkflowExecutionsByEnvironment(ctx, environmentID)
}

func (r *Repository) GetExecutionByID(ctx context.Context, id, environmentID uuid.UUID) (db.WorkflowExecution, error) {
	return r.q.GetWorkflowExecutionByID(ctx, db.GetWorkflowExecutionByIDParams{ID: id, EnvironmentID: environmentID})
}

func (r *Repository) GetSubscriberByID(ctx context.Context, id, environmentID uuid.UUID) (db.Subscriber, error) {
	return r.q.GetSubscriberByID(ctx, db.GetSubscriberByIDParams{ID: id, EnvironmentID: environmentID})
}

func (r *Repository) GetTemplateByID(ctx context.Context, id, environmentID uuid.UUID) (db.Template, error) {
	return r.q.GetTemplateByID(ctx, db.GetTemplateByIDParams{ID: id, EnvironmentID: environmentID})
}

func (r *Repository) GetStepExecution(ctx context.Context, executionID uuid.UUID, stepID string) (db.WorkflowStepExecution, error) {
	return r.q.GetWorkflowStepExecution(ctx, db.GetWorkflowStepExecutionParams{ExecutionID: executionID, StepID: stepID})
}

func (r *Repository) CreateStepExecution(ctx context.Context, arg db.CreateWorkflowStepExecutionParams) (db.WorkflowStepExecution, error) {
	return r.q.CreateWorkflowStepExecution(ctx, arg)
}

func (r *Repository) UpdateStepExecutionState(ctx context.Context, arg db.UpdateWorkflowStepExecutionStateParams) (db.WorkflowStepExecution, error) {
	return r.q.UpdateWorkflowStepExecutionState(ctx, arg)
}

func (r *Repository) UpdateExecutionState(ctx context.Context, executionID, environmentID uuid.UUID, status string, currentStepID *string, completedAt, failedAt pgtype.Timestamptz) (db.WorkflowExecution, error) {
	return r.q.UpdateWorkflowExecutionState(ctx, db.UpdateWorkflowExecutionStateParams{
		ID:            executionID,
		EnvironmentID: environmentID,
		Status:        status,
		CurrentStepID: currentStepID,
		CompletedAt:   completedAt,
		FailedAt:      failedAt,
	})
}

func (r *Repository) ListStepExecutionsByExecution(ctx context.Context, executionID uuid.UUID) ([]db.WorkflowStepExecution, error) {
	return r.q.ListWorkflowStepExecutionsByExecution(ctx, executionID)
}

func (r *Repository) Update(ctx context.Context, arg db.UpdateWorkflowParams) (db.Workflow, error) {
	return r.q.UpdateWorkflow(ctx, arg)
}

func (r *Repository) UpdateDefinition(ctx context.Context, arg db.UpdateWorkflowDefinitionParams) (db.Workflow, error) {
	return r.q.UpdateWorkflowDefinition(ctx, arg)
}

func (r *Repository) Delete(ctx context.Context, id, environmentID uuid.UUID) error {
	return r.q.DeleteWorkflow(ctx, db.DeleteWorkflowParams{ID: id, EnvironmentID: environmentID})
}

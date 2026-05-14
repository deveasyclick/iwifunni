package subscriber

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

func (r *Repository) Create(ctx context.Context, arg db.CreateSubscriberParams) (db.Subscriber, error) {
	return r.q.CreateSubscriber(ctx, arg)
}

func (r *Repository) List(ctx context.Context, projectID uuid.UUID) ([]db.Subscriber, error) {
	return r.q.ListSubscribersByProject(ctx, projectID)
}

func (r *Repository) GetByID(ctx context.Context, id, projectID uuid.UUID) (db.Subscriber, error) {
	return r.q.GetSubscriberByID(ctx, db.GetSubscriberByIDParams{ID: id, ProjectID: projectID})
}

func (r *Repository) Update(ctx context.Context, arg db.UpdateSubscriberParams) (db.Subscriber, error) {
	return r.q.UpdateSubscriber(ctx, arg)
}

func (r *Repository) Delete(ctx context.Context, id, projectID uuid.UUID) error {
	return r.q.DeleteSubscriber(ctx, db.DeleteSubscriberParams{ID: id, ProjectID: projectID})
}

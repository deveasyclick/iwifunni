package subscriber

import (
	"context"
	"strings"

	db "github.com/deveasyclick/iwifunni/internal/db/gen"
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

func (r *Repository) List(ctx context.Context, environmentID uuid.UUID) ([]db.Subscriber, error) {
	return r.q.ListSubscribersByEnvironment(ctx, environmentID)
}

func (r *Repository) Search(ctx context.Context, environmentID uuid.UUID, query string) ([]db.Subscriber, error) {
	pattern := "%" + strings.TrimSpace(query) + "%"
	return r.q.SearchSubscribers(ctx, db.SearchSubscribersParams{
		EnvironmentID: environmentID,
		Lower:         pattern,
	})
}

func (r *Repository) GetByID(ctx context.Context, id, environmentID uuid.UUID) (db.Subscriber, error) {
	return r.q.GetSubscriberByID(ctx, db.GetSubscriberByIDParams{ID: id, EnvironmentID: environmentID})
}

func (r *Repository) Update(ctx context.Context, arg db.UpdateSubscriberParams) (db.Subscriber, error) {
	return r.q.UpdateSubscriber(ctx, arg)
}

func (r *Repository) Delete(ctx context.Context, id, environmentID uuid.UUID) error {
	return r.q.DeleteSubscriber(ctx, db.DeleteSubscriberParams{ID: id, EnvironmentID: environmentID})
}

func (r *Repository) GetSubscriberByID(ctx context.Context, id, environmentID uuid.UUID) (db.Subscriber, error) {
	return r.GetByID(ctx, id, environmentID)
}

func (r *Repository) CreateSubscriber(ctx context.Context, arg db.CreateSubscriberParams) (db.Subscriber, error) {
	return r.Create(ctx, arg)
}

func (r *Repository) UpdateSubscriber(ctx context.Context, arg db.UpdateSubscriberParams) (db.Subscriber, error) {
	return r.Update(ctx, arg)
}

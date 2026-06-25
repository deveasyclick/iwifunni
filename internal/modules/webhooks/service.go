package webhooks

import (
	"context"
	"time"

	"github.com/deveasyclick/iwifunni/internal/db"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

// Service handles webhook business logic.
type Service struct {
	dispatcher *Dispatcher
	q          *db.Queries
}

func NewService(q *db.Queries, dispatcher *Dispatcher) *Service {
	return &Service{q: q, dispatcher: dispatcher}
}

type CreateInput struct {
	EnvironmentID uuid.UUID
	URL       string
	Secret    string
	Events    []string
}

func (s *Service) Create(ctx context.Context, in CreateInput) (db.Webhook, error) {
	ts := pgtype.Timestamptz{Time: nowUTC(), Valid: true}
	return s.q.CreateWebhook(ctx, db.CreateWebhookParams{
		ID:            uuid.New(),
		EnvironmentID: in.EnvironmentID,
		Url:           in.URL,
		Secret:        in.Secret,
		Events:        in.Events,
		CreatedAt:     ts,
		UpdatedAt:     ts,
	})
}

func (s *Service) List(ctx context.Context, environmentID uuid.UUID) ([]db.Webhook, error) {
	return s.q.ListWebhooksByEnvironment(ctx, environmentID)
}

func (s *Service) Delete(ctx context.Context, id, environmentID uuid.UUID) error {
	return s.q.DeleteWebhook(ctx, db.DeleteWebhookParams{ID: id, EnvironmentID: environmentID})
}

func nowUTC() time.Time { return time.Now().UTC() }

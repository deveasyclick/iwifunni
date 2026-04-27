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
	ProjectID uuid.UUID
	URL       string
	Secret    string
	Events    []string
}

func (s *Service) Create(ctx context.Context, in CreateInput) (db.Webhook, error) {
	ts := pgtype.Timestamptz{Time: nowUTC(), Valid: true}
	return s.q.CreateWebhook(ctx, db.CreateWebhookParams{
		ID:        uuid.New(),
		ProjectID: in.ProjectID,
		Url:       in.URL,
		Secret:    in.Secret,
		Events:    in.Events,
		CreatedAt: ts,
		UpdatedAt: ts,
	})
}

func (s *Service) List(ctx context.Context, projectID uuid.UUID) ([]db.Webhook, error) {
	return s.q.ListWebhooksByProject(ctx, projectID)
}

func (s *Service) Delete(ctx context.Context, id, projectID uuid.UUID) error {
	return s.q.DeleteWebhook(ctx, db.DeleteWebhookParams{ID: id, ProjectID: projectID})
}

func nowUTC() time.Time { return time.Now().UTC() }

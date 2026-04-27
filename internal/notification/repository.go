package notification

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

func (r *Repository) InsertByProject(ctx context.Context, arg db.InsertNotificationByProjectParams) error {
	return r.q.InsertNotificationByProject(ctx, arg)
}

func (r *Repository) Insert(ctx context.Context, arg db.InsertNotificationParams) error {
	return r.q.InsertNotification(ctx, arg)
}

func (r *Repository) UpdateStatus(ctx context.Context, id uuid.UUID, status string, updatedAt pgtype.Timestamptz) error {
	return r.q.UpdateNotificationStatus(ctx, db.UpdateNotificationStatusParams{
		ID:        id,
		Status:    status,
		UpdatedAt: updatedAt,
	})
}

func (r *Repository) InsertDeliveryAttempt(ctx context.Context, arg db.InsertDeliveryAttemptParams) error {
	return r.q.InsertDeliveryAttempt(ctx, arg)
}

func (r *Repository) GetActiveProviderByChannel(ctx context.Context, projectID uuid.UUID, channel string) (db.Provider, error) {
	return r.q.GetActiveProjectProviderByChannel(ctx, db.GetActiveProjectProviderByChannelParams{
		ProjectID: projectID,
		Channel:   channel,
	})
}

func (r *Repository) GetServiceChannelConfig(ctx context.Context, arg db.GetServiceChannelConfigParams) (db.ServiceChannelConfig, error) {
	return r.q.GetServiceChannelConfig(ctx, arg)
}

package notification

import (
	"context"
	"encoding/json"

	"github.com/deveasyclick/iwifunni/internal/db/gen"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

type Repository struct {
	q *db.Queries
}

func NewRepository(q *db.Queries) *Repository {
	return &Repository{q: q}
}

func (r *Repository) UpsertByProjectJob(ctx context.Context, arg db.UpsertNotificationByEnvironmentJobParams) (db.Notification, error) {
	row, err := r.q.UpsertNotificationByEnvironmentJob(ctx, arg)
	if err != nil {
		return db.Notification{}, err
	}
	return notificationFromProjectUpsertRow(row), nil
}

func (r *Repository) ListByProject(ctx context.Context, projectID uuid.UUID, includeTest bool) ([]db.Notification, error) {
	rows, err := r.q.ListEnvironmentNotifications(ctx, db.ListEnvironmentNotificationsParams{
		EnvironmentID: pgtype.UUID{Bytes: projectID, Valid: true},
		Column2:       includeTest,
	})
	if err != nil {
		return nil, err
	}
	items := make([]db.Notification, 0, len(rows))
	for _, row := range rows {
		items = append(items, notificationFromListProjectRow(row))
	}
	return items, nil
}

func (r *Repository) ListByWorkflowID(ctx context.Context, projectID, workflowID uuid.UUID, limit int32) ([]db.Notification, error) {
	metadataFilter, err := json.Marshal(map[string]string{"workflow_id": workflowID.String()})
	if err != nil {
		return nil, err
	}
	rows, err := r.q.ListNotificationsByWorkflowID(ctx, db.ListNotificationsByWorkflowIDParams{
		EnvironmentID: pgtype.UUID{Bytes: projectID, Valid: true},
		Column2:       metadataFilter,
		Limit:         limit,
	})
	if err != nil {
		return nil, err
	}
	items := make([]db.Notification, 0, len(rows))
	for _, row := range rows {
		items = append(items, notificationFromListWorkflowRow(row))
	}
	return items, nil
}

func (r *Repository) GetByProject(ctx context.Context, id, projectID uuid.UUID) (db.Notification, error) {
	row, err := r.q.GetEnvironmentNotificationByID(ctx, db.GetEnvironmentNotificationByIDParams{
		ID:            id,
		EnvironmentID: pgtype.UUID{Bytes: projectID, Valid: true},
	})
	if err != nil {
		return db.Notification{}, err
	}
	return notificationFromGetProjectRow(row), nil
}

func (r *Repository) GetByJobID(ctx context.Context, jobID string) (db.Notification, error) {
	if jobID == "" {
		return db.Notification{}, pgx.ErrNoRows
	}
	row, err := r.q.GetNotificationByJobID(ctx, &jobID)
	if err != nil {
		return db.Notification{}, err
	}
	return notificationFromGetByJobIDRow(row), nil
}

func notificationFromProjectUpsertRow(row db.UpsertNotificationByEnvironmentJobRow) db.Notification {
	return db.Notification{
		ID:            row.ID,
		Title:         row.Title,
		Message:       row.Message,
		Channels:      row.Channels,
		Recipient:     row.Recipient,
		Metadata:      row.Metadata,
		Status:        row.Status,
		EnvironmentID: row.EnvironmentID,
		CreatedAt:     row.CreatedAt,
		UpdatedAt:     row.UpdatedAt,
		JobID:         row.JobID,
	}
}

func notificationFromGetByJobIDRow(row db.GetNotificationByJobIDRow) db.Notification {
	return db.Notification{
		ID:            row.ID,
		Title:         row.Title,
		Message:       row.Message,
		Channels:      row.Channels,
		Recipient:     row.Recipient,
		Metadata:      row.Metadata,
		Status:        row.Status,
		EnvironmentID: row.EnvironmentID,
		CreatedAt:     row.CreatedAt,
		UpdatedAt:     row.UpdatedAt,
		JobID:         row.JobID,
	}
}

func notificationFromListProjectRow(row db.ListEnvironmentNotificationsRow) db.Notification {
	return db.Notification{
		ID:            row.ID,
		Title:         row.Title,
		Message:       row.Message,
		Channels:      row.Channels,
		Recipient:     row.Recipient,
		Metadata:      row.Metadata,
		Status:        row.Status,
		EnvironmentID: row.EnvironmentID,
		CreatedAt:     row.CreatedAt,
		UpdatedAt:     row.UpdatedAt,
		JobID:         row.JobID,
	}
}

func notificationFromGetProjectRow(row db.GetEnvironmentNotificationByIDRow) db.Notification {
	return db.Notification{
		ID:            row.ID,
		Title:         row.Title,
		Message:       row.Message,
		Channels:      row.Channels,
		Recipient:     row.Recipient,
		Metadata:      row.Metadata,
		Status:        row.Status,
		EnvironmentID: row.EnvironmentID,
		CreatedAt:     row.CreatedAt,
		UpdatedAt:     row.UpdatedAt,
		JobID:         row.JobID,
	}
}

func notificationFromListWorkflowRow(row db.ListNotificationsByWorkflowIDRow) db.Notification {
	return db.Notification{
		ID:        row.ID,
		Title:     row.Title,
		Message:   row.Message,
		Channels:  row.Channels,
		Status:    row.Status,
		IsTest:    row.IsTest,
		CreatedAt: row.CreatedAt,
		UpdatedAt: row.UpdatedAt,
	}
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

func (r *Repository) ListDeliveryAttemptsByNotificationID(ctx context.Context, notificationID uuid.UUID) ([]db.DeliveryAttempt, error) {
	return r.q.ListDeliveryAttemptsByNotificationID(ctx, notificationID)
}

func (r *Repository) GetActiveProvidersByChannel(ctx context.Context, projectID uuid.UUID, channel string) ([]db.Integration, error) {
	return r.q.GetActiveEnvironmentIntegrationsByChannel(ctx, db.GetActiveEnvironmentIntegrationsByChannelParams{
		EnvironmentID: projectID,
		Channel:       channel,
	})
}

func (r *Repository) GetWorkflowByID(ctx context.Context, id, projectID uuid.UUID) (db.Workflow, error) {
	return r.q.GetWorkflowByID(ctx, db.GetWorkflowByIDParams{ID: id, EnvironmentID: projectID})
}

func (r *Repository) GetSubscriberByID(ctx context.Context, id, projectID uuid.UUID) (db.Subscriber, error) {
	return r.q.GetSubscriberByID(ctx, db.GetSubscriberByIDParams{ID: id, EnvironmentID: projectID})
}

func (r *Repository) GetTemplateByID(ctx context.Context, id, projectID uuid.UUID) (db.Template, error) {
	return r.q.GetTemplateByID(ctx, db.GetTemplateByIDParams{ID: id, EnvironmentID: projectID})
}

func (r *Repository) GetUserByID(ctx context.Context, id uuid.UUID) (db.User, error) {
	return r.q.GetUserByID(ctx, id)
}

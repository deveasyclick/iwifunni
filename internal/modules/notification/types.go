package notification

import (
	"context"
	"errors"
	"time"

	"github.com/deveasyclick/iwifunni/internal/db"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

var ErrInvalidSendRequest = errors.New("invalid notification request")

// NotificationView is the public representation of a notification.
type NotificationView struct {
	ID            string         `json:"id"`
	EnvironmentID *string        `json:"environment_id,omitempty"`
	Title         string         `json:"title"`
	Message       string         `json:"message"`
	Channels      []string       `json:"channels"`
	Metadata      map[string]any `json:"metadata"`
	Status        string         `json:"status"`
	IsTest        bool           `json:"is_test"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
}

// NotificationWithAttempts pairs a notification with its delivery attempts.
type NotificationWithAttempts struct {
	Notification     *NotificationView `json:"notification"`
	DeliveryAttempts []map[string]any  `json:"delivery_attempts"`
}

type subscriberChannelStatus struct {
	Email string `json:"email,omitempty"`
	SMS   string `json:"sms,omitempty"`
	Push  string `json:"push,omitempty"`
}

type notificationStore interface {
	UpsertByProjectJob(ctx context.Context, arg db.UpsertNotificationByEnvironmentJobParams) (db.Notification, error)
	ListByProject(ctx context.Context, projectID uuid.UUID, includeTest bool) ([]db.Notification, error)
	ListByWorkflowID(ctx context.Context, projectID uuid.UUID, workflowID uuid.UUID, limit int32) ([]db.Notification, error)
	GetByProject(ctx context.Context, id, projectID uuid.UUID) (db.Notification, error)
	GetByJobID(ctx context.Context, jobID string) (db.Notification, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status string, updatedAt pgtype.Timestamptz) error
	InsertDeliveryAttempt(ctx context.Context, arg db.InsertDeliveryAttemptParams) error
	ListDeliveryAttemptsByNotificationID(ctx context.Context, notificationID uuid.UUID) ([]db.DeliveryAttempt, error)
	GetActiveProvidersByChannel(ctx context.Context, projectID uuid.UUID, channel string) ([]db.Provider, error)
	GetWorkflowByID(ctx context.Context, id, projectID uuid.UUID) (db.Workflow, error)
	GetSubscriberByID(ctx context.Context, id, projectID uuid.UUID) (db.Subscriber, error)
	GetTemplateByID(ctx context.Context, id, projectID uuid.UUID) (db.Template, error)
	GetUserByID(ctx context.Context, id uuid.UUID) (db.GetUserByIDRow, error)
}

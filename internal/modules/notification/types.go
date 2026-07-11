package notification

import (
	"context"
	"errors"
	"time"

	db "github.com/deveasyclick/iwifunni/internal/db/gen"
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
	InsertDeliveryAttempt(ctx context.Context, arg db.UpsertDeliveryAttemptParams) error
	ListDeliveryAttemptsByNotificationID(ctx context.Context, notificationID uuid.UUID) ([]db.DeliveryAttempt, error)
}

type workflowStore interface {
	GetWorkflowByID(ctx context.Context, id, environmentID uuid.UUID) (db.Workflow, error)
}

type subscriberStore interface {
	GetSubscriberByID(ctx context.Context, id, environmentID uuid.UUID) (db.Subscriber, error)
	CreateSubscriber(ctx context.Context, arg db.CreateSubscriberParams) (db.Subscriber, error)
	UpdateSubscriber(ctx context.Context, arg db.UpdateSubscriberParams) (db.Subscriber, error)
}

type templateStore interface {
	GetTemplateByID(ctx context.Context, id, environmentID uuid.UUID) (db.Template, error)
}

type integrationStore interface {
	ListByChannel(ctx context.Context, environmentID uuid.UUID, channel string) ([]db.Integration, error)
}

type userStore interface {
	GetUserByID(ctx context.Context, id uuid.UUID) (db.User, error)
}

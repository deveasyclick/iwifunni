package notification

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/deveasyclick/iwifunni/internal/db"
	"github.com/deveasyclick/iwifunni/internal/registry"
	"github.com/deveasyclick/iwifunni/internal/types"
	"github.com/deveasyclick/iwifunni/internal/utils/crypto"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

type fakeNotificationStore struct {
	notifications     map[string]db.Notification
	notificationCount int
	statusUpdates     []string
	attemptCount      int
	providers         []db.Provider
}

func newFakeNotificationStore() *fakeNotificationStore {
	return &fakeNotificationStore{
		notifications: make(map[string]db.Notification),
		providers: []db.Provider{{
			ID:            uuid.New(),
			EnvironmentID: uuid.New(),
			Name:          "test-email",
			Channel:       "email",
			Config:        []byte(`{"host":"smtp.example.com","port":587,"username":"user","password":"pass","from":"noreply@example.com"}`),
			IsActive:      true,
			IsPrimary:     true,
		}},
	}
}

func (s *fakeNotificationStore) UpsertByProjectJob(_ context.Context, arg db.UpsertNotificationByEnvironmentJobParams) (db.Notification, error) {
	if arg.JobID != nil {
		if existing, ok := s.notifications[*arg.JobID]; ok {
			existing.Title = arg.Title
			existing.Message = arg.Message
			existing.Channels = arg.Channels
			existing.Recipient = arg.Recipient
			existing.Metadata = arg.Metadata
			existing.UpdatedAt = arg.UpdatedAt
			s.notifications[*arg.JobID] = existing
			return existing, nil
		}
	}
	s.notificationCount++
	notification := db.Notification{
		ID:            arg.ID,
		Title:         arg.Title,
		Message:       arg.Message,
		Channels:      append([]string(nil), arg.Channels...),
		Recipient:     arg.Recipient,
		Metadata:      arg.Metadata,
		Status:        arg.Status,
		EnvironmentID: arg.EnvironmentID,
		CreatedAt:     arg.CreatedAt,
		UpdatedAt:     arg.UpdatedAt,
		JobID:         arg.JobID,
	}
	if arg.JobID != nil {
		s.notifications[*arg.JobID] = notification
	}
	return notification, nil
}

func (s *fakeNotificationStore) ListByProject(_ context.Context, _ uuid.UUID, _ bool) ([]db.Notification, error) {
	items := make([]db.Notification, 0, len(s.notifications))
	for _, item := range s.notifications {
		items = append(items, item)
	}
	return items, nil
}

func (s *fakeNotificationStore) ListByWorkflowID(_ context.Context, _, _ uuid.UUID, _ int32) ([]db.Notification, error) {
	items := make([]db.Notification, 0, len(s.notifications))
	for _, item := range s.notifications {
		items = append(items, item)
	}
	return items, nil
}

func (s *fakeNotificationStore) GetByProject(_ context.Context, id, _ uuid.UUID) (db.Notification, error) {
	for _, item := range s.notifications {
		if item.ID == id {
			return item, nil
		}
	}
	return db.Notification{}, pgx.ErrNoRows
}

func (s *fakeNotificationStore) GetByJobID(_ context.Context, jobID string) (db.Notification, error) {
	item, ok := s.notifications[jobID]
	if !ok {
		return db.Notification{}, pgx.ErrNoRows
	}
	return item, nil
}

func (s *fakeNotificationStore) UpdateStatus(_ context.Context, id uuid.UUID, status string, updatedAt pgtype.Timestamptz) error {
	for key, item := range s.notifications {
		if item.ID != id {
			continue
		}
		item.Status = status
		item.UpdatedAt = updatedAt
		s.notifications[key] = item
		s.statusUpdates = append(s.statusUpdates, status)
		return nil
	}
	return pgx.ErrNoRows
}

func (s *fakeNotificationStore) InsertDeliveryAttempt(_ context.Context, _ db.InsertDeliveryAttemptParams) error {
	s.attemptCount++
	return nil
}

func (s *fakeNotificationStore) ListDeliveryAttemptsByNotificationID(_ context.Context, _ uuid.UUID) ([]db.DeliveryAttempt, error) {
	return nil, nil
}

func (s *fakeNotificationStore) GetUserByID(_ context.Context, _ uuid.UUID) (db.GetUserByIDRow, error) {
	return db.GetUserByIDRow{}, pgx.ErrNoRows
}

func (s *fakeNotificationStore) GetActiveProvidersByChannel(_ context.Context, _ uuid.UUID, _ string) ([]db.Provider, error) {
	return s.providers, nil
}

func (s *fakeNotificationStore) GetWorkflowByID(_ context.Context, _, _ uuid.UUID) (db.Workflow, error) {
	return db.Workflow{}, pgx.ErrNoRows
}

func (s *fakeNotificationStore) GetSubscriberByID(_ context.Context, _, _ uuid.UUID) (db.Subscriber, error) {
	return db.Subscriber{}, pgx.ErrNoRows
}

func (s *fakeNotificationStore) GetTemplateByID(_ context.Context, _, _ uuid.UUID) (db.Template, error) {
	return db.Template{}, pgx.ErrNoRows
}

type fakeProvider struct {
	name           string
	channel        string
	sendCount      int
	lastConfigJSON []byte
}

func (p *fakeProvider) Name() string {
	if p.name != "" {
		return p.name
	}
	return "test-email"
}
func (p *fakeProvider) Channel() string { return p.channel }
func (p *fakeProvider) Send(_ context.Context, job *types.NotificationJob, configJSON []byte) ([]registry.DeliveryAttempt, error) {
	p.sendCount++
	p.lastConfigJSON = append([]byte(nil), configJSON...)
	return []registry.DeliveryAttempt{{Destination: job.Recipient.Email}}, nil
}

func TestServiceSendIsIdempotentByJobID(t *testing.T) {
	t.Parallel()

	store := newFakeNotificationStore()
	provider := &fakeProvider{channel: "email"}
	service := NewService(store, "0123456789abcdef0123456789abcdef")
	service.registry = registry.New(provider)

	originalNow := now
	now = func() time.Time {
		return time.Date(2026, time.May, 14, 22, 0, 0, 0, time.UTC)
	}
	defer func() { now = originalNow }()

	projectID := uuid.New()
	job := &types.NotificationJob{
		JobID:     "job-123",
		ProjectID: projectID.String(),
		Title:     "Welcome",
		Message:   "Hello there",
		Channels:  []string{"email"},
		Recipient: types.Recipient{Email: "user@example.com"},
		Metadata:  map[string]string{"source": "test"},
	}

	if err := service.Send(context.Background(), job); err != nil {
		t.Fatalf("first Send() error = %v", err)
	}
	if err := service.Send(context.Background(), job); err != nil {
		t.Fatalf("second Send() error = %v", err)
	}

	if store.notificationCount != 1 {
		t.Fatalf("notificationCount = %d, want 1", store.notificationCount)
	}
	if provider.sendCount != 1 {
		t.Fatalf("provider send count = %d, want 1", provider.sendCount)
	}
	if len(store.statusUpdates) != 1 || store.statusUpdates[0] != "sent" {
		t.Fatalf("statusUpdates = %v, want [sent]", store.statusUpdates)
	}
	if store.attemptCount != 1 {
		t.Fatalf("attemptCount = %d, want 1", store.attemptCount)
	}
	stored, err := store.GetByJobID(context.Background(), job.JobID)
	if err != nil {
		t.Fatalf("GetByJobID() error = %v", err)
	}
	if stored.Status != "sent" {
		t.Fatalf("stored status = %s, want sent", stored.Status)
	}
}

func TestServiceSendUsesDecryptedProjectProviderCredentials(t *testing.T) {
	t.Parallel()

	encryptionKey := "0123456789abcdef0123456789abcdef"
	encrypted, err := crypto.Encrypt([]byte(`{"api_key":"SG.secret"}`), encryptionKey)
	if err != nil {
		t.Fatalf("Encrypt() error = %v", err)
	}

	store := newFakeNotificationStore()
	store.providers = []db.Provider{{
		ID:            uuid.New(),
		EnvironmentID: uuid.New(),
		Name:          "sendgrid",
		Channel:       "email",
		Credentials:   []byte(`"` + encrypted + `"`),
		Config:        []byte(`{"from_email":"no-reply@example.com"}`),
		IsActive:      true,
		IsPrimary:     true,
	}}

	provider := &fakeProvider{name: "sendgrid", channel: "email"}
	service := NewService(store, encryptionKey)
	service.registry = registry.New(provider)

	job := &types.NotificationJob{
		JobID:     "job-sendgrid",
		ProjectID: uuid.New().String(),
		Title:     "Welcome",
		Message:   "Hello there",
		Channels:  []string{"email"},
		Recipient: types.Recipient{Email: "user@example.com"},
	}

	if err := service.Send(context.Background(), job); err != nil {
		t.Fatalf("Send() error = %v", err)
	}

	var config map[string]string
	if err := json.Unmarshal(provider.lastConfigJSON, &config); err != nil {
		t.Fatalf("Unmarshal(lastConfigJSON) error = %v", err)
	}
	if config["api_key"] != "SG.secret" {
		t.Fatalf("config.api_key = %q, want SG.secret", config["api_key"])
	}
	if config["from_email"] != "no-reply@example.com" {
		t.Fatalf("config.from_email = %q, want no-reply@example.com", config["from_email"])
	}
}

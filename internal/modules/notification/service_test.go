package notification

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/deveasyclick/iwifunni/internal/db/gen"
	"github.com/deveasyclick/iwifunni/internal/registry"
	"github.com/deveasyclick/iwifunni/internal/types"
	"github.com/deveasyclick/iwifunni/internal/utils/crypto"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

type fakeNotificationStore struct {
	notifications      map[string]db.Notification
	notificationCount  int
	statusUpdates      []string
	attemptCount       int
	providers          []db.Integration
	workflow           db.Workflow
	template           db.Template
	subscriber         db.Subscriber
	user               db.User
}

func newFakeNotificationStore() *fakeNotificationStore {
	return &fakeNotificationStore{
		notifications: make(map[string]db.Notification),
		providers: []db.Integration{{
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

func (s *fakeNotificationStore) InsertDeliveryAttempt(_ context.Context, _ db.UpsertDeliveryAttemptParams) error {
	s.attemptCount++
	return nil
}

func (s *fakeNotificationStore) ListDeliveryAttemptsByNotificationID(_ context.Context, _ uuid.UUID) ([]db.DeliveryAttempt, error) {
	return nil, nil
}

func (s *fakeNotificationStore) GetUserByID(_ context.Context, _ uuid.UUID) (db.User, error) {
	if s.user.ID != uuid.Nil {
		return s.user, nil
	}
	return db.User{}, pgx.ErrNoRows
}

func (s *fakeNotificationStore) ListByChannel(_ context.Context, _ uuid.UUID, _ string) ([]db.Integration, error) {
	return s.providers, nil
}

func (s *fakeNotificationStore) GetWorkflowByID(_ context.Context, _, _ uuid.UUID) (db.Workflow, error) {
	if s.workflow.ID != uuid.Nil {
		return s.workflow, nil
	}
	return db.Workflow{}, pgx.ErrNoRows
}

func (s *fakeNotificationStore) GetSubscriberByID(_ context.Context, _, _ uuid.UUID) (db.Subscriber, error) {
	if s.subscriber.ID != uuid.Nil {
		return s.subscriber, nil
	}
	return db.Subscriber{}, pgx.ErrNoRows
}

func (s *fakeNotificationStore) CreateSubscriber(_ context.Context, arg db.CreateSubscriberParams) (db.Subscriber, error) {
	return db.Subscriber{
		ID:            arg.ID,
		EnvironmentID: arg.EnvironmentID,
		Name:          arg.Name,
		FirstName:     arg.FirstName,
		LastName:      arg.LastName,
		Email:         arg.Email,
		Phone:         arg.Phone,
		PushToken:     arg.PushToken,
		Channels:      arg.Channels,
		Status:        arg.Status,
		Tags:          arg.Tags,
		Metadata:      arg.Metadata,
		Preferences:   arg.Preferences,
	}, nil
}

func (s *fakeNotificationStore) UpdateSubscriber(_ context.Context, arg db.UpdateSubscriberParams) (db.Subscriber, error) {
	return db.Subscriber{
		ID:            arg.ID,
		EnvironmentID: arg.EnvironmentID,
		Name:          arg.Name,
		FirstName:     arg.FirstName,
		LastName:      arg.LastName,
		Email:         arg.Email,
		Phone:         arg.Phone,
		PushToken:     arg.PushToken,
		Channels:      arg.Channels,
		Status:        arg.Status,
		Tags:          arg.Tags,
		Metadata:      arg.Metadata,
		Preferences:   arg.Preferences,
	}, nil
}

func (s *fakeNotificationStore) GetTemplateByID(_ context.Context, _, _ uuid.UUID) (db.Template, error) {
	if s.template.ID != uuid.Nil {
		return s.template, nil
	}
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
	service := NewService(Stores{
			Notifications: store,
			Workflows:     store,
			Subscribers:   store,
			Templates:     store,
			Integrations:  store,
			Users:         store,
		}, "0123456789abcdef0123456789abcdef")
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
	store.providers = []db.Integration{{
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
	service := NewService(Stores{
			Notifications: store,
			Workflows:     store,
			Subscribers:   store,
			Templates:     store,
			Integrations:  store,
			Users:         store,
		}, encryptionKey)
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

func TestPrepareJobResolvesTemplateFromDefinition(t *testing.T) {
	t.Parallel()

	templateID := uuid.New()
	projectID := uuid.New()
	subscriberID := uuid.New()

	def := map[string]interface{}{
		"trigger": map[string]interface{}{
			"event": "test.event",
		},
		"nodes": []interface{}{
			map[string]interface{}{
				"id":   "email_1",
				"type": "notification",
				"config": map[string]interface{}{
					"template_id": templateID.String(),
					"channels":    []string{"email"},
				},
			},
		},
		"edges": []interface{}{},
	}
	defJSON, _ := json.Marshal(def)

	store := newFakeNotificationStore()
	store.workflow = db.Workflow{
		ID:            uuid.New(),
		EnvironmentID: projectID,
		Channels:      []string{"email"},
		TemplateIds:   []byte("{}"),
		DefinitionJson: defJSON,
		Name:           "Test Workflow",
	}
	store.subscriber = db.Subscriber{
		ID:    subscriberID,
		Email: &([]string{"user@example.com"}[0]),
	}
	store.template = db.Template{
		ID:        templateID,
		Channel:   "email",
		IsActive:  true,
		Subject:   &([]string{"Hello"}[0]),
		Body:      "<p>{{.name}}</p>",
	}
	store.user = db.User{
		ID:    subscriberID,
		Email: "user@example.com",
	}

	service := NewService(Stores{
		Notifications: store,
		Workflows:     store,
		Subscribers:   store,
		Templates:     store,
		Integrations:  store,
		Users:         store,
	}, "0123456789abcdef0123456789abcdef")

	job := &types.NotificationJob{
		ProjectID: projectID.String(),
		WorkflowID: store.workflow.ID.String(),
		Channels:  []string{"email"},
		To: &types.SubscriberTo{
			SubscriberID: subscriberID.String(),
		},
		IsSystemUser: true,
		Metadata:     map[string]string{"name": "Ada"},
	}

	prepared, err := service.PrepareJob(context.Background(), job)
	if err != nil {
		t.Fatalf("PrepareJob() error = %v", err)
	}

	if len(prepared.SkippedChannels) > 0 {
		for _, sc := range prepared.SkippedChannels {
			t.Errorf("unexpected skipped channel %s: %s", sc.Channel, sc.Reason)
		}
	}

	if len(prepared.Channels) == 0 {
		t.Fatal("expected at least one deliverable channel, got none")
	}

	content, ok := prepared.ChannelContent["email"]
	if !ok {
		t.Fatal("expected channel content for 'email'")
	}
	if content.Title != "Hello" {
		t.Errorf("content.Title = %q, want %q", content.Title, "Hello")
	}
	if content.Message != "<p>user@example.com</p>" {
		t.Errorf("content.Message = %q, want %q", content.Message, "<p>user@example.com</p>")
	}
}

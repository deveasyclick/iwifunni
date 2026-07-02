package notification

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	db "github.com/deveasyclick/iwifunni/internal/db/gen"
	"github.com/deveasyclick/iwifunni/internal/modules/webhooks"
	"github.com/deveasyclick/iwifunni/internal/registry"
	"github.com/deveasyclick/iwifunni/internal/types"
	"github.com/deveasyclick/iwifunni/internal/utils/ptr"
	"github.com/deveasyclick/iwifunni/pkg/logger"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

// Service handles notification delivery logic.
type Service struct {
	repo          notificationStore
	workflows     workflowStore
	subscribers   subscriberStore
	templates     templateStore
	integrations  integrationStore
	users         userStore
	registry      *registry.Registry
	dispatcher    *webhooks.Dispatcher
	encryptionKey string
}

type Stores struct {
	Notifications notificationStore
	Workflows     workflowStore
	Subscribers   subscriberStore
	Templates     templateStore
	Integrations  integrationStore
	Users         userStore
}

func NewService(stores Stores, encryptionKey string) *Service {
	return &Service{
		repo:          stores.Notifications,
		workflows:     stores.Workflows,
		subscribers:   stores.Subscribers,
		templates:     stores.Templates,
		integrations:  stores.Integrations,
		users:         stores.Users,
		registry:      registry.NewDefault(),
		encryptionKey: encryptionKey,
	}
}

func NewServiceWithWebhooks(stores Stores, dispatcher *webhooks.Dispatcher, encryptionKey string) *Service {
	return &Service{
		repo:          stores.Notifications,
		workflows:     stores.Workflows,
		subscribers:   stores.Subscribers,
		templates:     stores.Templates,
		integrations:  stores.Integrations,
		users:         stores.Users,
		registry:      registry.NewDefault(),
		dispatcher:    dispatcher,
		encryptionKey: encryptionKey,
	}
}

func (s *Service) PrepareJob(ctx context.Context, job *types.NotificationJob) (*types.NotificationJob, error) {
	if job == nil {
		return nil, invalidSend("notification payload is required")
	}

	prepared := *job
	prepared.Title = strings.TrimSpace(prepared.Title)
	prepared.Message = strings.TrimSpace(prepared.Message)
	prepared.WorkflowID = strings.TrimSpace(prepared.WorkflowID)
	prepared.SubscriberID = strings.TrimSpace(prepared.SubscriberID)

	// Resolve subscriber from "to" field if present
	if prepared.To != nil {
		var err error
		prepared, err = s.resolveToAndBuildRecipient(ctx, prepared)
		if err != nil {
			return nil, err
		}
	}

	// Workflow-based sends: title and message come from templates, skip direct validation
	if prepared.WorkflowID != "" && prepared.SubscriberID != "" {
		if prepared.ProjectID == "" {
			return nil, invalidSend("workflow-based sends require project-scoped authentication")
		}
		return s.prepareWorkflowJob(ctx, &prepared)
	}

	// Direct sends: require title, message, and channels
	if prepared.Title == "" || prepared.Message == "" {
		return nil, invalidSend("title and message are required")
	}

	prepared.Channels = normalizeChannels(prepared.Channels)
	if len(prepared.Channels) == 0 {
		return nil, invalidSend("at least one channel is required")
	}
	if err := validateRecipientForChannels(prepared.Recipient, prepared.Channels); err != nil {
		return nil, err
	}
	return &prepared, nil
}

// resolveToAndBuildRecipient resolves a subscriber from the "to" field
// and populates the Recipient fields from the subscriber's contact data.
func (s *Service) resolveToAndBuildRecipient(ctx context.Context, prepared types.NotificationJob) (types.NotificationJob, error) {
	subscriber, err := s.resolveSubscriberFromTo(ctx, prepared.ProjectID, prepared.To, prepared.WorkflowID)
	if err != nil {
		return prepared, err
	}

	prepared.SubscriberID = subscriber.ID.String()

	if subscriber.Email != nil {
		prepared.Recipient.Email = strings.TrimSpace(*subscriber.Email)
	}
	if subscriber.Phone != nil {
		prepared.Recipient.PhoneNumber = strings.TrimSpace(*subscriber.Phone)
	}
	if subscriber.PushToken != nil {
		prepared.Recipient.PushTokens = []string{strings.TrimSpace(*subscriber.PushToken)}
	}
	prepared.Recipient.Reference = subscriber.ID.String()

	return prepared, nil
}

// findOrUpdateSubscriber looks up a subscriber by ID and updates contact fields
// if any non-empty values are provided. Returns pgx.ErrNoRows if not found
// so the caller can fall through to creation.
func (s *Service) findOrUpdateSubscriber(ctx context.Context, projectUUID uuid.UUID, to *types.SubscriberTo, name string, subscriberID uuid.UUID) (db.Subscriber, error) {
	sub, err := s.subscribers.GetSubscriberByID(ctx, subscriberID, projectUUID)
	if err != nil {
		return db.Subscriber{}, err
	}

	firstName := strings.TrimSpace(to.FirstName)
	lastName := strings.TrimSpace(to.LastName)
	email := strings.TrimSpace(to.Email)
	phone := strings.TrimSpace(to.Phone)
	push := strings.TrimSpace(to.Push)

	// Subscriber found — update fields if any are provided
	hasUpdates := firstName != "" || lastName != "" || email != "" || phone != "" || push != ""
	if !hasUpdates {
		return sub, nil
	}

	updateName := sub.Name
	if firstName != "" || lastName != "" {
		updateName = name
	}
	channels := deriveSubscriberChannels(
		ptr.StrPtr(ptr.Coalesce(email, sub.Email)),
		ptr.StrPtr(ptr.Coalesce(phone, sub.Phone)),
		ptr.StrPtr(ptr.Coalesce(push, sub.PushToken)),
	)
	statusJSON, _ := json.Marshal(map[string]string{
		"email": "subscribed",
		"sms":   "subscribed",
		"push":  "subscribed",
	})

	return s.subscribers.UpdateSubscriber(ctx, db.UpdateSubscriberParams{
		ID:            sub.ID,
		EnvironmentID: sub.EnvironmentID,
		Name:          updateName,
		FirstName:     ptr.StrPtr(ptr.Coalesce(firstName, sub.FirstName)),
		LastName:      ptr.StrPtr(ptr.Coalesce(lastName, sub.LastName)),
		Email:         ptr.StrPtr(ptr.Coalesce(email, sub.Email)),
		Phone:         ptr.StrPtr(ptr.Coalesce(phone, sub.Phone)),
		PushToken:     ptr.StrPtr(ptr.Coalesce(push, sub.PushToken)),
		Channels:      channels,
		Status:        statusJSON,
		Tags:          sub.Tags,
		Metadata:      sub.Metadata,
		Preferences:   sub.Preferences,
	})
}

// resolveSubscriberFromTo resolves or creates a subscriber from the "to" field.
// If subscriberId is provided, it tries to find the subscriber and update fields.
// If not found or no subscriberId, it creates a new subscriber.
func (s *Service) resolveSubscriberFromTo(ctx context.Context, projectID string, to *types.SubscriberTo, workflowName string) (db.Subscriber, error) {
	projectUUID, err := uuid.Parse(projectID)
	if err != nil {
		return db.Subscriber{}, invalidSend("invalid project_id")
	}

	firstName := strings.TrimSpace(to.FirstName)
	lastName := strings.TrimSpace(to.LastName)
	email := strings.TrimSpace(to.Email)
	phone := strings.TrimSpace(to.Phone)
	push := strings.TrimSpace(to.Push)

	name := strings.TrimSpace(firstName + " " + lastName)
	if name == "" && workflowName != "" {
		name = workflowName
	}

	// If subscriberId is provided, try to find and optionally update
	if to.SubscriberID != "" {
		subscriberID, err := uuid.Parse(to.SubscriberID)
		if err != nil {
			return db.Subscriber{}, invalidSend("invalid subscriber_id in to field")
		}

		sub, err := s.findOrUpdateSubscriber(ctx, projectUUID, to, name, subscriberID)
		if err != nil {
			if !errors.Is(err, pgx.ErrNoRows) {
				return db.Subscriber{}, err
			}
			// ErrNoRows — fall through to create
		} else {
			return sub, nil
		}
	}

	// Create new subscriber
	channels := deriveSubscriberChannels(ptr.StrPtr(email), ptr.StrPtr(phone), ptr.StrPtr(push))
	statusJSON, _ := json.Marshal(map[string]string{
		"email": "subscribed",
		"sms":   "subscribed",
		"push":  "subscribed",
	})

	newSub, err := s.subscribers.CreateSubscriber(ctx, db.CreateSubscriberParams{
		ID:            uuid.New(),
		EnvironmentID: projectUUID,
		Name:          name,
		FirstName:     ptr.StrPtr(firstName),
		LastName:      ptr.StrPtr(lastName),
		Email:         ptr.StrPtr(email),
		Phone:         ptr.StrPtr(phone),
		PushToken:     ptr.StrPtr(push),
		Channels:      channels,
		Status:        statusJSON,
		Tags:          []string{},
		Metadata:      []byte("{}"),
		Preferences:   []byte("{}"),
	})
	if err != nil {
		return db.Subscriber{}, err
	}
	return newSub, nil
}

// deriveSubscriberChannels derives channel list from contact fields.
func deriveSubscriberChannels(email, phone, pushToken *string) []string {
	channels := make([]string, 0, 3)
	if email != nil {
		channels = append(channels, "email")
	}
	if phone != nil {
		channels = append(channels, "sms")
	}
	if pushToken != nil {
		channels = append(channels, "push")
	}
	return channels
}

func (s *Service) prepareWorkflowJob(ctx context.Context, prepared *types.NotificationJob) (*types.NotificationJob, error) {
	if prepared.ProjectID == "" {
		return nil, invalidSend("workflow-based sends require project-scoped authentication")
	}

	projectID, err := uuid.Parse(prepared.ProjectID)
	if err != nil {
		return nil, invalidSend("invalid project_id")
	}
	workflowID, err := uuid.Parse(prepared.WorkflowID)
	if err != nil {
		return nil, invalidSend("invalid workflow_id")
	}
	subscriberID, err := uuid.Parse(prepared.SubscriberID)
	if err != nil {
		return nil, invalidSend("invalid subscriber_id")
	}

	workflowRecord, err := s.workflows.GetWorkflowByID(ctx, workflowID, projectID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("workflow not found: %w", err)
		}
		return nil, err
	}

	var subscriberRecord db.Subscriber

	if prepared.IsSystemUser {
		userRecord, err := s.users.GetUserByID(ctx, subscriberID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, fmt.Errorf("user not found: %w", err)
			}
			return nil, err
		}

		userEmail := userRecord.Email
		userName := strings.TrimSpace(userRecord.FirstName + " " + userRecord.LastName)
		if userName == "" {
			userName = userEmail
		}

		subscriberRecord = db.Subscriber{
			ID:    subscriberID,
			Name:  userName,
			Email: &userEmail,
		}
	} else {
		subscriberRecord, err = s.subscribers.GetSubscriberByID(ctx, subscriberID, projectID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, fmt.Errorf("subscriber not found: %w", err)
			}
			return nil, err
		}
	}

	channels := workflowRecord.Channels
	templateIDs, tmplErr := parseWorkflowTemplateIDs(workflowRecord.TemplateIds)
	if tmplErr != nil {
		templateIDs = map[string]string{}
	}

	if len(channels) == 0 && len(workflowRecord.DefinitionJson) > 0 {
		type notificationNodeCfg struct {
			TemplateID string   `json:"template_id,omitempty"`
			Channels   []string `json:"channels"`
		}
		type defNode struct {
			Type   string          `json:"type"`
			Config json.RawMessage `json:"config,omitempty"`
		}
		type workflowDef struct {
			Nodes []defNode `json:"nodes"`
		}

		var def workflowDef
		if parseErr := json.Unmarshal(workflowRecord.DefinitionJson, &def); parseErr == nil {
			seen := make(map[string]bool)
			for _, node := range def.Nodes {
				if node.Type == "notification" && len(node.Config) > 0 {
					var cfg notificationNodeCfg
					if parseErr := json.Unmarshal(node.Config, &cfg); parseErr == nil {
						for _, ch := range cfg.Channels {
							if !seen[ch] {
								channels = append(channels, ch)
								seen[ch] = true
							}
							if cfg.TemplateID != "" {
								templateIDs[ch] = cfg.TemplateID
							}
						}
					}
				}
			}
		}
	}

	requestedChannels := prepared.Channels

	if len(templateIDs) > 0 {
		templateIDsJSON, _ := json.Marshal(templateIDs)
		workflowRecord.TemplateIds = templateIDsJSON
	}

	if requestedChannels != nil {
		requested := make(map[string]bool, len(requestedChannels))
		for _, ch := range requestedChannels {
			requested[ch] = true
		}
		filtered := make([]string, 0, len(requestedChannels))
		for _, ch := range channels {
			if requested[ch] {
				filtered = append(filtered, ch)
			}
		}
		channels = filtered
	}

	workflowRecord.Channels = channels
	prepared.Channels = channels
	prepared.Channels, prepared.ChannelContent, prepared.SkippedChannels, prepared.Recipient, err = s.prepareWorkflowDelivery(ctx, projectID, workflowRecord, subscriberRecord, *prepared)
	if err != nil {
		return nil, err
	}
	prepared.Metadata = enrichMetadata(prepared.Metadata, workflowRecord, subscriberRecord)

	return prepared, nil
}

// SendSync delivers a notification synchronously and returns the
// notification ID if successful. Unlike Send, it does not swallow
// delivery failures — useful for test sends where the caller needs
// to know the result.
func (s *Service) SendSync(ctx context.Context, job *types.NotificationJob) (uuid.UUID, error) {
	return s.send(ctx, job, true)
}

// Send delivers a notification asynchronously, recording delivery attempts
// in the database but swallowing per-channel errors.
func (s *Service) Send(ctx context.Context, job *types.NotificationJob) error {
	_, err := s.send(ctx, job, false)
	return err
}

func (s *Service) send(ctx context.Context, job *types.NotificationJob, reportErrors bool) (uuid.UUID, error) {
	if job == nil {
		return uuid.Nil, invalidSend("notification payload is required")
	}
	job.JobID = strings.TrimSpace(job.JobID)
	if job.JobID == "" {
		return uuid.Nil, invalidSend("job_id is required")
	}

	recipient, err := json.Marshal(job.Recipient)
	if err != nil {
		return uuid.Nil, err
	}
	metadata, err := json.Marshal(job.Metadata)
	if err != nil {
		return uuid.Nil, err
	}
	nowTs := pgtype.Timestamptz{Time: now(), Valid: true}

	if job.ProjectID == "" {
		return uuid.Nil, nil
	}

	projectID, err := uuid.Parse(job.ProjectID)
	if err != nil {
		return uuid.Nil, fmt.Errorf("invalid project_id: %w", err)
	}
	channels := job.Channels
	if channels == nil {
		channels = []string{}
	}

	notificationRecord, err := s.repo.UpsertByProjectJob(ctx, db.UpsertNotificationByEnvironmentJobParams{
		ID:            uuid.New(),
		JobID:         &job.JobID,
		EnvironmentID: pgtype.UUID{Bytes: projectID, Valid: true},
		Title:         job.Title,
		Message:       job.Message,
		Channels:      channels,
		Recipient:     recipient,
		Metadata:      metadata,
		Status:        "pending",
		IsTest:        job.IsTest,
		CreatedAt:     nowTs,
		UpdatedAt:     nowTs,
	})
	if err != nil {
		return uuid.Nil, err
	}
	notificationID := notificationRecord.ID
	if isTerminalNotificationStatus(notificationRecord.Status) {
		return notificationID, nil
	}

	var deliveryErrors []string
	successCount, failureCount, skippedCount := 0, 0, len(job.SkippedChannels)
	for _, skipped := range job.SkippedChannels {
		if err := s.recordSkipped(ctx, notificationID, skipped.Channel, skipped.Reason); err != nil {
			logger.Get().Warn("failed to record skipped delivery attempt", "error", err, "channel", skipped.Channel)
		}
	}
	for _, channel := range job.Channels {
		if err := s.deliverProjectChannel(ctx, projectID, notificationID, channel, job); err != nil {
			logger.Get().Warn("delivery attempt failed", "error", err, "channel", channel)
			failureCount++
			if reportErrors {
				deliveryErrors = append(deliveryErrors, fmt.Sprintf("%s: %s", channel, err.Error()))
			}
		} else {
			successCount++
		}
	}

	status := finalNotificationStatus(successCount, failureCount, skippedCount)
	if err := s.repo.UpdateStatus(ctx, notificationID, status, pgtype.Timestamptz{Time: now(), Valid: true}); err != nil {
		return notificationID, err
	}
	if s.dispatcher != nil {
		event := "notification.sent"
		if status == "failed" || status == "skipped" {
			event = "notification.failed"
		}
		s.dispatcher.Dispatch(ctx, projectID, event, webhooks.EventPayload{
			Event:          event,
			NotificationID: notificationID.String(),
			EnvironmentID:  projectID.String(),
			Timestamp:      now().Format(time.RFC3339),
		})
	}
	if reportErrors && len(deliveryErrors) > 0 {
		return notificationID, errors.New(strings.Join(deliveryErrors, "; "))
	}
	return notificationID, nil
}

func invalidSend(message string) error {
	return fmt.Errorf("%w: %s", ErrInvalidSendRequest, message)
}

func normalizeChannels(channels []string) []string {
	seen := make(map[string]struct{}, len(channels))
	result := make([]string, 0, len(channels))
	for _, channel := range channels {
		normalized := strings.ToLower(strings.TrimSpace(channel))
		switch normalized {
		case "email", "sms", "push":
		default:
			continue
		}
		if _, ok := seen[normalized]; ok {
			continue
		}
		seen[normalized] = struct{}{}
		result = append(result, normalized)
	}
	return result
}

func validateRecipientForChannels(recipient types.Recipient, channels []string) error {
	for _, channel := range channels {
		switch channel {
		case "email":
			if strings.TrimSpace(recipient.Email) == "" {
				return invalidSend("email recipient is required for email channel")
			}
		case "sms":
			if strings.TrimSpace(recipient.PhoneNumber) == "" {
				return invalidSend("phone_number is required for sms channel")
			}
		case "push":
			if len(recipient.PushTokens) == 0 {
				return invalidSend("push_tokens are required for push channel")
			}
		}
	}
	return nil
}

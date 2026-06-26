package notification

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/deveasyclick/iwifunni/internal/shared/validate"
	"github.com/deveasyclick/iwifunni/internal/shared/authctx"
	"github.com/deveasyclick/iwifunni/internal/queue"
	"github.com/deveasyclick/iwifunni/internal/types"
	"github.com/deveasyclick/iwifunni/pkg/logger"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type Handler struct {
	service  *Service
	producer *queue.Producer
}

func NewHandler(service *Service, producer *queue.Producer) *Handler {
	return &Handler{service: service, producer: producer}
}

func (h *Handler) Register(r chi.Router) {
	h.RegisterReadRoutes(r)
	h.RegisterSendRoutes(r)
}

func (h *Handler) RegisterSendRoutes(r chi.Router) {
	r.Post("/notifications", h.create)
}

func (h *Handler) RegisterReadRoutes(r chi.Router) {
	r.Get("/notifications", h.list)
	r.Get("/notifications/{notificationID}", h.get)
	r.Get("/notifications/{notificationID}/poll", h.poll)
	r.Get("/workflows/{workflowID}/activities", h.listByWorkflow)
}

// RegisterDashboardSendRoutes registers notification send endpoints
// under JWT-protected dashboard routes (e.g. for test sends and workflow triggers).
func (h *Handler) RegisterDashboardSendRoutes(r chi.Router) {
	r.Post("/notifications/test-send", h.testSend)
	r.Post("/notifications/trigger", h.triggerWorkflow)
}

type createRequest struct {
	WorkflowID   string            `json:"workflow_id,omitempty"`
	SubscriberID string            `json:"subscriber_id,omitempty"`
	Title        string            `json:"title" validate:"required"`
	Message      string            `json:"message" validate:"required"`
	Channels     []string          `json:"channels,omitempty"`
	Recipient    types.Recipient   `json:"recipient" validate:"required"`
	Metadata     map[string]string `json:"metadata,omitempty"`
	Sync         bool              `json:"sync,omitempty"`
}

type triggerWorkflowRequest struct {
	WorkflowID   string            `json:"workflow_id" validate:"required"`
	SubscriberID string            `json:"subscriber_id"`
	Channels     []string          `json:"channels,omitempty"`
	Recipient    types.Recipient   `json:"recipient,omitempty"`
	Metadata     map[string]string `json:"metadata,omitempty"`
	IsSystemUser bool              `json:"is_system,omitempty"`
}

type testSendRequest struct {
	Channel        string `json:"channel" validate:"omitempty,oneof=email sms"`
	RecipientEmail string `json:"recipient_email,omitempty"`
	RecipientPhone string `json:"recipient_phone,omitempty"`
	Subject        string `json:"subject,omitempty"`
	Body           string `json:"body" validate:"required"`
	SenderName     string `json:"sender_name,omitempty"`
	SenderEmail    string `json:"sender_email,omitempty"`
	SenderID       string `json:"sender_id,omitempty"`
}

func (h *Handler) testSend(w http.ResponseWriter, r *http.Request) {
	log := logger.Get()

	var payload testSendRequest
	if !validate.DecodeAndRespond(w, r, &payload) {
		return
	}

	// Determine channel; default to email
	channel := payload.Channel
	if channel == "" {
		channel = "email"
	}

	switch channel {
	case "email":
		if payload.RecipientEmail == "" || payload.Body == "" {
			log.Warn().Str("recipient_email", payload.RecipientEmail).Bool("has_body", payload.Body != "").Msg("test-send: missing required fields for email")
			http.Error(w, "recipient_email and body are required for email", http.StatusBadRequest)
			return
		}
	case "sms":
		if payload.RecipientPhone == "" || payload.Body == "" {
			log.Warn().Str("recipient_phone", payload.RecipientPhone).Bool("has_body", payload.Body != "").Msg("test-send: missing required fields for sms")
			http.Error(w, "recipient_phone and body are required for sms", http.StatusBadRequest)
			return
		}
	default:
		log.Warn().Str("channel", channel).Msg("test-send: unsupported channel")
		http.Error(w, "unsupported channel; use 'email' or 'sms'", http.StatusBadRequest)
		return
	}

	environmentID, ok := notificationProjectIDFromContext(r)
	if !ok {
		log.Warn().Msg("test-send: unauthorized — no environment in context")
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	metadata := map[string]string{}
	recipient := types.Recipient{}
	title := payload.Body
	isTest := true

	switch channel {
	case "email":
		title = payload.Subject
		if title == "" {
			title = "(no subject)"
		}
		recipient.Email = payload.RecipientEmail
		if payload.SenderName != "" {
			metadata["sender_name"] = payload.SenderName
		}
		if payload.SenderEmail != "" {
			metadata["sender_email"] = payload.SenderEmail
		}
	case "sms":
		title = "Test SMS"
		recipient.PhoneNumber = payload.RecipientPhone
		if payload.SenderID != "" {
			metadata["sender_id"] = payload.SenderID
		}
	}

	job := &types.NotificationJob{
		ProjectID: environmentID.String(),
		Title:     title,
		Message:   payload.Body,
		Channels:  []string{channel},
		Recipient: recipient,
		Metadata:  metadata,
		IsTest:    isTest,
	}

	log.Info().
		Str("channel", channel).
		Str("environment_id", environmentID.String()).
		Msg("test-send: preparing job")

	preparedJob, err := h.service.PrepareJob(r.Context(), job)
	if err != nil {
		log.Error().Err(err).Str("channel", channel).Msg("test-send: prepare job failed")
		h.respondSendError(w, err)
		return
	}

	if preparedJob.JobID == "" {
		preparedJob.JobID = uuid.NewString()
	}

	log.Info().
		Str("job_id", preparedJob.JobID).
		Str("channel", channel).
		Msg("test-send: delivering synchronously")

	if _, err := h.service.SendSync(r.Context(), preparedJob); err != nil {
		log.Error().Err(err).Str("channel", channel).Msg("test-send: delivery failed")
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	log.Info().
		Str("job_id", preparedJob.JobID).
		Str("channel", channel).
		Msg("test-send: delivered successfully")

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "sent"})
}

// triggerWorkflow handles synchronous workflow trigger requests
// authenticated via JWT (dashboard sessions).
func (h *Handler) triggerWorkflow(w http.ResponseWriter, r *http.Request) {
	environmentID, ok := notificationProjectIDFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var payload triggerWorkflowRequest
	if !validate.DecodeAndRespond(w, r, &payload) {
		return
	}

	job := &types.NotificationJob{
		WorkflowID:    payload.WorkflowID,
		SubscriberID:  payload.SubscriberID,
		Channels:      payload.Channels,
		Recipient:     payload.Recipient,
		Metadata:      payload.Metadata,
		ProjectID:     environmentID.String(),
		IsSystemUser:  payload.IsSystemUser,
	}

	preparedJob, err := h.service.PrepareJob(r.Context(), job)
	if err != nil {
		h.respondSendError(w, err)
		return
	}

	if preparedJob.JobID == "" {
		preparedJob.JobID = uuid.NewString()
	}

	// Pre-create the notification record so we can return the ID immediately.
	// The worker will pick up the job and update the record via upsert by job_id.
	notificationID := uuid.New()
	if err := h.service.CreateQueuedNotification(r.Context(), preparedJob, notificationID); err != nil {
		logger.Get().Error().Err(err).Msg("trigger-workflow: failed to create queued notification")
		http.Error(w, "failed to create notification", http.StatusInternalServerError)
		return
	}

	if err := h.producer.Enqueue(r.Context(), preparedJob); err != nil {
		logger.Get().Error().Err(err).Msg("trigger-workflow: failed to enqueue job")
		http.Error(w, "failed to enqueue notification", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusAccepted)
	_ = json.NewEncoder(w).Encode(map[string]any{
		"status":          "queued",
		"notification_id": notificationID.String(),
	})
}

func (h *Handler) create(w http.ResponseWriter, r *http.Request) {
	var payload createRequest
	if !validate.DecodeAndRespond(w, r, &payload) {
		return
	}

	job := &types.NotificationJob{
		WorkflowID:   payload.WorkflowID,
		SubscriberID: payload.SubscriberID,
		Title:        payload.Title,
		Message:      payload.Message,
		Channels:     payload.Channels,
		Recipient:    payload.Recipient,
		Metadata:     payload.Metadata,
	}

	environment := authctx.GetAuthenticatedEnvironment(r.Context())
	if environment == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	job.ProjectID = environment.EnvironmentID.String()

	preparedJob, err := h.service.PrepareJob(r.Context(), job)
	if err != nil {
		h.respondSendError(w, err)
		return
	}

	if err := h.producer.Enqueue(r.Context(), preparedJob); err != nil {
		http.Error(w, "failed to enqueue notification", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusAccepted)
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "queued"})
}

func (h *Handler) respondSendError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, ErrInvalidSendRequest):
		http.Error(w, err.Error(), http.StatusBadRequest)
	case errors.Is(err, pgx.ErrNoRows):
		http.Error(w, err.Error(), http.StatusNotFound)
	default:
		http.Error(w, "failed to prepare notification", http.StatusInternalServerError)
	}
}

func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	environmentID, ok := notificationProjectIDFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	includeTest := r.URL.Query().Get("include_test") == "true"

	items, err := h.service.ListByProject(r.Context(), environmentID, includeTest)
	if err != nil {
		http.Error(w, "failed to list notifications", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(items)
}

func (h *Handler) get(w http.ResponseWriter, r *http.Request) {
	environmentID, ok := notificationProjectIDFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	notificationID, err := uuid.Parse(chi.URLParam(r, "notificationID"))
	if err != nil {
		http.Error(w, "invalid notification id", http.StatusBadRequest)
		return
	}

	item, err := h.service.GetByProject(r.Context(), notificationID, environmentID)
	if err != nil {
		http.Error(w, "notification not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(item)
}

func (h *Handler) poll(w http.ResponseWriter, r *http.Request) {
	environmentID, ok := notificationProjectIDFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	notificationID, err := uuid.Parse(chi.URLParam(r, "notificationID"))
	if err != nil {
		http.Error(w, "invalid notification id", http.StatusBadRequest)
		return
	}

	result, err := h.service.GetByProjectWithAttempts(r.Context(), notificationID, environmentID)
	if err != nil {
		http.Error(w, "notification not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(result)
}

func (h *Handler) listByWorkflow(w http.ResponseWriter, r *http.Request) {
	environmentID, ok := notificationProjectIDFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	workflowIDStr := chi.URLParam(r, "workflowID")
	workflowID, err := uuid.Parse(workflowIDStr)
	if err != nil {
		http.Error(w, "invalid workflow id", http.StatusBadRequest)
		return
	}

	limit := int32(50)
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, parseErr := strconv.Atoi(l); parseErr == nil && parsed > 0 && parsed <= 100 {
			limit = int32(parsed)
		}
	}

	items, err := h.service.ListByWorkflowID(r.Context(), environmentID, workflowID, limit)
	if err != nil {
		http.Error(w, "failed to list workflow activities", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(items)
}

func notificationProjectIDFromContext(r *http.Request) (uuid.UUID, bool) {
	if environmentID, ok := authctx.GetEnvironmentID(r.Context()); ok {
		return environmentID, true
	}

	return uuid.Nil, false
}

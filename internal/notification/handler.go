package notification

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/deveasyclick/iwifunni/internal/auth"
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
}

// RegisterDashboardSendRoutes registers notification send endpoints
// under JWT-protected dashboard routes (e.g. for test sends).
func (h *Handler) RegisterDashboardSendRoutes(r chi.Router) {
	r.Post("/notifications/test-send", h.testSend)
}

type createRequest struct {
	WorkflowID   string            `json:"workflow_id,omitempty"`
	SubscriberID string            `json:"subscriber_id,omitempty"`
	Title        string            `json:"title"`
	Message      string            `json:"message"`
	Channels     []string          `json:"channels,omitempty"`
	Recipient    types.Recipient   `json:"recipient"`
	Metadata     map[string]string `json:"metadata,omitempty"`
}

type testSendRequest struct {
	Channel        string `json:"channel"`
	RecipientEmail string `json:"recipient_email,omitempty"`
	RecipientPhone string `json:"recipient_phone,omitempty"`
	Subject        string `json:"subject,omitempty"`
	Body           string `json:"body"`
	SenderName     string `json:"sender_name,omitempty"`
	SenderEmail    string `json:"sender_email,omitempty"`
	SenderID       string `json:"sender_id,omitempty"`
}

func (h *Handler) testSend(w http.ResponseWriter, r *http.Request) {
	log := logger.Get()

	var payload testSendRequest
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		log.Warn().Err(err).Msg("test-send: invalid payload")
		http.Error(w, "invalid payload", http.StatusBadRequest)
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

	if err := h.service.SendSync(r.Context(), preparedJob); err != nil {
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

func (h *Handler) create(w http.ResponseWriter, r *http.Request) {
	var payload createRequest
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
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

	environment := auth.GetAuthenticatedEnvironment(r.Context())
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

	items, err := h.service.ListByProject(r.Context(), environmentID)
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

func notificationProjectIDFromContext(r *http.Request) (uuid.UUID, bool) {
	if environmentID, ok := auth.GetEnvironmentID(r.Context()); ok {
		return environmentID, true
	}

	return uuid.Nil, false
}

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
	RecipientEmail string `json:"recipient_email"`
	Subject        string `json:"subject"`
	Body           string `json:"body"`
	SenderName     string `json:"sender_name,omitempty"`
	SenderEmail    string `json:"sender_email,omitempty"`
}

func (h *Handler) testSend(w http.ResponseWriter, r *http.Request) {
	log := logger.Get()

	var payload testSendRequest
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		log.Warn().Err(err).Msg("test-send: invalid payload")
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}

	if payload.RecipientEmail == "" || payload.Body == "" {
		log.Warn().Str("recipient_email", payload.RecipientEmail).Bool("has_body", payload.Body != "").Msg("test-send: missing required fields")
		http.Error(w, "recipient_email and body are required", http.StatusBadRequest)
		return
	}

	environmentID, ok := notificationProjectIDFromContext(r)
	if !ok {
		log.Warn().Msg("test-send: unauthorized — no environment in context")
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	subject := payload.Subject
	if subject == "" {
		subject = "(no subject)"
	}

	job := &types.NotificationJob{
		ProjectID: environmentID.String(),
		Title:     subject,
		Message:   payload.Body,
		Channels:  []string{"email"},
		Recipient: types.Recipient{
			Email: payload.RecipientEmail,
		},
		Metadata: map[string]string{
			"sender_name":  payload.SenderName,
			"sender_email": payload.SenderEmail,
		},
	}

	log.Info().
		Str("recipient", payload.RecipientEmail).
		Str("subject", subject).
		Str("environment_id", environmentID.String()).
		Msg("test-send: preparing job")

	preparedJob, err := h.service.PrepareJob(r.Context(), job)
	if err != nil {
		log.Error().Err(err).Str("recipient", payload.RecipientEmail).Msg("test-send: prepare job failed")
		h.respondSendError(w, err)
		return
	}

	log.Info().
		Str("job_id", preparedJob.JobID).
		Str("recipient", payload.RecipientEmail).
		Msg("test-send: enqueuing job")

	if err := h.producer.Enqueue(r.Context(), preparedJob); err != nil {
		log.Error().Err(err).Str("recipient", payload.RecipientEmail).Msg("test-send: enqueue failed")
		http.Error(w, "failed to enqueue test notification", http.StatusInternalServerError)
		return
	}

	log.Info().
		Str("job_id", preparedJob.JobID).
		Str("recipient", payload.RecipientEmail).
		Msg("test-send: successfully queued")

	w.WriteHeader(http.StatusAccepted)
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "queued"})
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

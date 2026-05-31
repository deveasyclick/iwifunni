package notification

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/deveasyclick/iwifunni/internal/auth"
	"github.com/deveasyclick/iwifunni/internal/queue"
	"github.com/deveasyclick/iwifunni/internal/types"
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

type createRequest struct {
	WorkflowID   string            `json:"workflow_id,omitempty"`
	SubscriberID string            `json:"subscriber_id,omitempty"`
	Title        string            `json:"title"`
	Message      string            `json:"message"`
	Channels     []string          `json:"channels,omitempty"`
	Recipient    types.Recipient   `json:"recipient"`
	Metadata     map[string]string `json:"metadata,omitempty"`
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

	// Resolve environment or legacy service from context.
	if environment := auth.GetAuthenticatedEnvironment(r.Context()); environment != nil {
		job.ProjectID = environment.EnvironmentID.String()
	} else if svc := auth.GetService(r.Context()); svc != nil {
		job.ServiceID = svc.ID.String()
	} else {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

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

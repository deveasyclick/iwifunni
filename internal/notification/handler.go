package notification

import (
	"encoding/json"
	"net/http"

	"github.com/deveasyclick/iwifunni/internal/auth"
	"github.com/deveasyclick/iwifunni/internal/queue"
	"github.com/deveasyclick/iwifunni/internal/types"
	"github.com/go-chi/chi/v5"
)

type Handler struct {
	service  *Service
	producer *queue.Producer
}

func NewHandler(service *Service, producer *queue.Producer) *Handler {
	return &Handler{service: service, producer: producer}
}

func (h *Handler) Register(r chi.Router) {
	r.Post("/notifications", h.create)
}

type createRequest struct {
	Title     string            `json:"title"`
	Message   string            `json:"message"`
	Channels  []string          `json:"channels,omitempty"`
	Recipient types.Recipient   `json:"recipient"`
	Metadata  map[string]string `json:"metadata,omitempty"`
}

func (h *Handler) create(w http.ResponseWriter, r *http.Request) {
	var payload createRequest
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}

	job := &types.NotificationJob{
		Title:     payload.Title,
		Message:   payload.Message,
		Channels:  payload.Channels,
		Recipient: payload.Recipient,
		Metadata:  payload.Metadata,
	}

	// Resolve project or legacy service from context
	if proj := auth.GetAuthenticatedProject(r.Context()); proj != nil {
		job.ProjectID = proj.ProjectID.String()
	} else if svc := auth.GetService(r.Context()); svc != nil {
		job.ServiceID = svc.ID.String()
	} else {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	if err := h.producer.Enqueue(r.Context(), job); err != nil {
		http.Error(w, "failed to enqueue notification", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusAccepted)
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "queued"})
}

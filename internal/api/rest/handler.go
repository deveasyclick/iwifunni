package rest

import (
	"encoding/json"
	"net/http"

	"github.com/deveasyclick/iwifunni/internal/auth"
	"github.com/deveasyclick/iwifunni/internal/storage"
	"github.com/deveasyclick/iwifunni/internal/types"
	"github.com/deveasyclick/iwifunni/internal/worker"
	"github.com/deveasyclick/iwifunni/internal/ws"
	"github.com/go-chi/chi/v5"
	"github.com/rs/zerolog/log"
)

type RequestPayload struct {
    UserID   string            `json:"user_id"`
    Title    string            `json:"title"`
    Message  string            `json:"message"`
    Channels []string          `json:"channels,omitempty"`
    Metadata map[string]string `json:"metadata,omitempty"`
}

type Handler struct {
    store       *storage.Store
    producer    *worker.Producer
    rateLimiter *auth.RateLimiter
}

func NewHandler(store *storage.Store, producer *worker.Producer, rateLimiter *auth.RateLimiter) *Handler {
    return &Handler{store: store, producer: producer, rateLimiter: rateLimiter}
}

func (h *Handler) Router(wsServer *ws.Server) http.Handler {
    r := chi.NewRouter()
    r.Use(auth.NewAuthMiddleware(h.store, h.rateLimiter))

    r.Post("/notifications", h.createNotification)
    r.Get("/ws", wsServer.HandleWebSocket)
    return r
}

func (h *Handler) createNotification(w http.ResponseWriter, r *http.Request) {
    var payload RequestPayload
    if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
        http.Error(w, "invalid payload", http.StatusBadRequest)
        return
    }
    if payload.UserID == "" || payload.Title == "" || payload.Message == "" {
        http.Error(w, "user_id, title and message are required", http.StatusBadRequest)
        return
    }
    svc := auth.GetService(r.Context())
    if svc == nil {
        http.Error(w, "missing authenticated service", http.StatusUnauthorized)
        return
    }

    job := types.NotificationJob{
        ServiceID: svc.ID,
        UserID:    payload.UserID,
        Title:     payload.Title,
        Message:   payload.Message,
        Channels:  payload.Channels,
        Metadata:  payload.Metadata,
    }
    if err := h.producer.Enqueue(r.Context(), &job); err != nil {
        log.Error().Err(err).Msg("failed to enqueue notification job")
        http.Error(w, "failed to queue notification", http.StatusInternalServerError)
        return
    }

    w.WriteHeader(http.StatusAccepted)
    _ = json.NewEncoder(w).Encode(map[string]string{"status": "queued"})
}

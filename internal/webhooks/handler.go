package webhooks

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/deveasyclick/iwifunni/internal/auth"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) Register(r chi.Router) {
	r.Post("/webhooks", h.create)
	r.Get("/webhooks", h.list)
	r.Delete("/webhooks/{webhookID}", h.delete)
}

type createRequest struct {
	URL    string   `json:"url"`
	Events []string `json:"events"`
	Secret string   `json:"secret"`
}

type webhookResponse struct {
	ID        uuid.UUID `json:"id"`
	URL       string    `json:"url"`
	Events    []string  `json:"events"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
}

func (h *Handler) create(w http.ResponseWriter, r *http.Request) {
	proj := auth.GetAuthenticatedProject(r.Context())
	if proj == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	var req createRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}
	if req.URL == "" || len(req.Events) == 0 || req.Secret == "" {
		http.Error(w, "url, events, and secret are required", http.StatusBadRequest)
		return
	}
	wh, err := h.service.Create(r.Context(), CreateInput{
		ProjectID: proj.ProjectID,
		URL:       req.URL,
		Secret:    req.Secret,
		Events:    req.Events,
	})
	if err != nil {
		http.Error(w, "failed to register webhook", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(webhookResponse{ID: wh.ID, URL: wh.Url, Events: wh.Events, IsActive: wh.IsActive, CreatedAt: wh.CreatedAt.Time})
}

func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	proj := auth.GetAuthenticatedProject(r.Context())
	if proj == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	whs, err := h.service.List(r.Context(), proj.ProjectID)
	if err != nil {
		http.Error(w, "failed to list webhooks", http.StatusInternalServerError)
		return
	}
	resp := make([]webhookResponse, 0, len(whs))
	for _, wh := range whs {
		resp = append(resp, webhookResponse{ID: wh.ID, URL: wh.Url, Events: wh.Events, IsActive: wh.IsActive, CreatedAt: wh.CreatedAt.Time})
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}

func (h *Handler) delete(w http.ResponseWriter, r *http.Request) {
	proj := auth.GetAuthenticatedProject(r.Context())
	if proj == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	webhookID, err := uuid.Parse(chi.URLParam(r, "webhookID"))
	if err != nil {
		http.Error(w, "invalid webhook id", http.StatusBadRequest)
		return
	}
	if err := h.service.Delete(r.Context(), webhookID, proj.ProjectID); err != nil {
		http.Error(w, "failed to delete webhook", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

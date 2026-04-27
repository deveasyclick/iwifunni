package provider

import (
	"encoding/json"
	"net/http"

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
	r.Post("/providers", h.create)
	r.Get("/providers", h.list)
	r.Get("/providers/{providerID}", h.get)
	r.Put("/providers/{providerID}", h.update)
	r.Delete("/providers/{providerID}", h.delete)
}

type createRequest struct {
	Name        string         `json:"name"`
	Channel     string         `json:"channel"`
	Credentials map[string]any `json:"credentials"`
	Config      map[string]any `json:"config,omitempty"`
}

type updateRequest struct {
	Name        string         `json:"name"`
	Channel     string         `json:"channel"`
	Credentials map[string]any `json:"credentials"`
	Config      map[string]any `json:"config,omitempty"`
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
	if req.Name == "" || req.Channel == "" || len(req.Credentials) == 0 {
		http.Error(w, "name, channel, and credentials are required", http.StatusBadRequest)
		return
	}
	p, err := h.service.Create(r.Context(), CreateInput{
		ProjectID:   proj.ProjectID,
		Name:        req.Name,
		Channel:     req.Channel,
		Credentials: req.Credentials,
		Config:      req.Config,
	})
	if err != nil {
		http.Error(w, "failed to create provider", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(map[string]any{
		"id": p.ID, "project_id": p.ProjectID, "name": p.Name,
		"channel": p.Channel, "is_active": p.IsActive, "created_at": p.CreatedAt,
	})
}

func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	proj := auth.GetAuthenticatedProject(r.Context())
	if proj == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	providers, err := h.service.List(r.Context(), proj.ProjectID)
	if err != nil {
		http.Error(w, "failed to list providers", http.StatusInternalServerError)
		return
	}
	type item struct {
		ID        uuid.UUID `json:"id"`
		Name      string    `json:"name"`
		Channel   string    `json:"channel"`
		IsActive  bool      `json:"is_active"`
		CreatedAt any       `json:"created_at"`
	}
	result := make([]item, 0, len(providers))
	for _, p := range providers {
		result = append(result, item{ID: p.ID, Name: p.Name, Channel: p.Channel, IsActive: p.IsActive, CreatedAt: p.CreatedAt})
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(result)
}

func (h *Handler) get(w http.ResponseWriter, r *http.Request) {
	proj := auth.GetAuthenticatedProject(r.Context())
	if proj == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	providerID, err := uuid.Parse(chi.URLParam(r, "providerID"))
	if err != nil {
		http.Error(w, "invalid provider id", http.StatusBadRequest)
		return
	}
	p, err := h.service.GetByID(r.Context(), providerID, proj.ProjectID)
	if err != nil {
		http.Error(w, "provider not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"id": p.ID, "project_id": p.ProjectID, "name": p.Name,
		"channel": p.Channel, "is_active": p.IsActive, "created_at": p.CreatedAt, "updated_at": p.UpdatedAt,
	})
}

func (h *Handler) update(w http.ResponseWriter, r *http.Request) {
	proj := auth.GetAuthenticatedProject(r.Context())
	if proj == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	providerID, err := uuid.Parse(chi.URLParam(r, "providerID"))
	if err != nil {
		http.Error(w, "invalid provider id", http.StatusBadRequest)
		return
	}
	var req updateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}
	if req.Name == "" || req.Channel == "" {
		http.Error(w, "name and channel are required", http.StatusBadRequest)
		return
	}
	p, err := h.service.Update(r.Context(), UpdateInput{
		ID:          providerID,
		ProjectID:   proj.ProjectID,
		Name:        req.Name,
		Channel:     req.Channel,
		Credentials: req.Credentials,
		Config:      req.Config,
	})
	if err != nil {
		http.Error(w, "failed to update provider", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"id": p.ID, "project_id": p.ProjectID, "name": p.Name,
		"channel": p.Channel, "is_active": p.IsActive, "updated_at": p.UpdatedAt,
	})
}

func (h *Handler) delete(w http.ResponseWriter, r *http.Request) {
	proj := auth.GetAuthenticatedProject(r.Context())
	if proj == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	providerID, err := uuid.Parse(chi.URLParam(r, "providerID"))
	if err != nil {
		http.Error(w, "invalid provider id", http.StatusBadRequest)
		return
	}
	if err := h.service.Delete(r.Context(), providerID, proj.ProjectID); err != nil {
		http.Error(w, "failed to delete provider", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

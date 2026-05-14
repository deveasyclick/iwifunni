package workflow

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/deveasyclick/iwifunni/internal/auth"
	"github.com/deveasyclick/iwifunni/internal/db"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) Register(r chi.Router) {
	r.Post("/workflows", h.create)
	r.Get("/workflows", h.list)
	r.Get("/workflows/{workflowID}", h.get)
	r.Put("/workflows/{workflowID}", h.update)
	r.Delete("/workflows/{workflowID}", h.delete)
}

type workflowRequest struct {
	Key         string            `json:"key"`
	Name        string            `json:"name"`
	Description *string           `json:"description"`
	Channels    []string          `json:"channels"`
	TemplateIDs map[string]string `json:"templateIds"`
	IsActive    bool              `json:"isActive"`
}

type workflowResponse struct {
	ID          uuid.UUID         `json:"id"`
	Key         string            `json:"key"`
	Name        string            `json:"name"`
	Description *string           `json:"description,omitempty"`
	Channels    []string          `json:"channels"`
	TemplateIDs map[string]string `json:"templateIds"`
	IsActive    bool              `json:"isActive"`
	CreatedAt   string            `json:"createdAt"`
	UpdatedAt   string            `json:"updatedAt"`
}

func (h *Handler) create(w http.ResponseWriter, r *http.Request) {
	projectID, ok := auth.GetProjectID(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	var req workflowRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}
	item, err := h.service.Create(r.Context(), CreateInput{
		ProjectID:   projectID,
		Key:         req.Key,
		Name:        req.Name,
		Description: req.Description,
		Channels:    req.Channels,
		TemplateIDs: req.TemplateIDs,
	})
	if err != nil {
		h.respondError(w, err)
		return
	}
	h.writeJSON(w, http.StatusCreated, workflowFromRecord(item))
}

func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	projectID, ok := auth.GetProjectID(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	items, err := h.service.List(r.Context(), projectID)
	if err != nil {
		http.Error(w, "failed to list workflows", http.StatusInternalServerError)
		return
	}
	response := make([]workflowResponse, 0, len(items))
	for _, item := range items {
		response = append(response, workflowFromRecord(item))
	}
	h.writeJSON(w, http.StatusOK, response)
}

func (h *Handler) get(w http.ResponseWriter, r *http.Request) {
	projectID, ok := auth.GetProjectID(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "workflowID"))
	if err != nil {
		http.Error(w, "invalid workflow id", http.StatusBadRequest)
		return
	}
	item, err := h.service.GetByID(r.Context(), id, projectID)
	if err != nil {
		h.respondError(w, err)
		return
	}
	h.writeJSON(w, http.StatusOK, workflowFromRecord(item))
}

func (h *Handler) update(w http.ResponseWriter, r *http.Request) {
	projectID, ok := auth.GetProjectID(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "workflowID"))
	if err != nil {
		http.Error(w, "invalid workflow id", http.StatusBadRequest)
		return
	}
	var req workflowRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}
	item, err := h.service.Update(r.Context(), UpdateInput{
		ID:          id,
		ProjectID:   projectID,
		Key:         req.Key,
		Name:        req.Name,
		Description: req.Description,
		Channels:    req.Channels,
		TemplateIDs: req.TemplateIDs,
		IsActive:    req.IsActive,
	})
	if err != nil {
		h.respondError(w, err)
		return
	}
	h.writeJSON(w, http.StatusOK, workflowFromRecord(item))
}

func (h *Handler) delete(w http.ResponseWriter, r *http.Request) {
	projectID, ok := auth.GetProjectID(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "workflowID"))
	if err != nil {
		http.Error(w, "invalid workflow id", http.StatusBadRequest)
		return
	}
	if err := h.service.Delete(r.Context(), id, projectID); err != nil {
		h.respondError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) respondError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, ErrInvalidWorkflow):
		http.Error(w, "invalid workflow payload", http.StatusBadRequest)
	case errors.Is(err, pgx.ErrNoRows):
		http.Error(w, "workflow not found", http.StatusNotFound)
	default:
		http.Error(w, "workflow request failed", http.StatusInternalServerError)
	}
}

func (h *Handler) writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func workflowFromRecord(item db.Workflow) workflowResponse {
	templateIDs := make(map[string]string)
	if len(item.TemplateIds) > 0 {
		_ = json.Unmarshal(item.TemplateIds, &templateIDs)
	}
	return workflowResponse{
		ID:          item.ID,
		Key:         item.Key,
		Name:        item.Name,
		Description: item.Description,
		Channels:    item.Channels,
		TemplateIDs: templateIDs,
		IsActive:    item.IsActive,
		CreatedAt:   formatTime(item.CreatedAt),
		UpdatedAt:   formatTime(item.UpdatedAt),
	}
}

func formatTime(value pgtype.Timestamptz) string {
	if !value.Valid {
		return ""
	}
	return value.Time.UTC().Format(time.RFC3339)
}

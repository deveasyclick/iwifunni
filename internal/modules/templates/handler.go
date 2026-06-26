package templates

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/deveasyclick/iwifunni/internal/shared/validate"
	"github.com/deveasyclick/iwifunni/internal/shared/authctx"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) RegisterDashboardRoutes(r chi.Router) {
	r.Post("/templates/upsert", h.upsert)
	r.Get("/templates/{templateID}", h.get)
	r.Patch("/templates/{templateID}", h.update)
}

type createRequest struct {
	Name    string  `json:"name" validate:"required"`
	Channel string  `json:"channel" validate:"required,oneof=email sms push"`
	Subject *string `json:"subject"`
	Body    string  `json:"body" validate:"required"`
}

type updateRequest struct {
	Subject *string `json:"subject"`
	Body    string  `json:"body" validate:"required"`
}

type templateResponse struct {
	ID            uuid.UUID `json:"id"`
	EnvironmentID uuid.UUID `json:"environment_id"`
	Name          string    `json:"name"`
	Channel       string    `json:"channel"`
	Subject       *string   `json:"subject"`
	Body          string    `json:"body"`
	Version       int32     `json:"version"`
	IsActive      bool      `json:"is_active"`
	CreatedAt     string    `json:"created_at"`
	UpdatedAt     string    `json:"updated_at"`
}

func formatTimestamptz(t pgtype.Timestamptz) string {
	if !t.Valid {
		return ""
	}
	return t.Time.Format(time.RFC3339Nano)
}

func (h *Handler) upsert(w http.ResponseWriter, r *http.Request) {
	environmentID, ok := authctx.GetEnvironmentID(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	var req createRequest
	if !validate.DecodeAndRespond(w, r, &req) {
		return
	}

	t, err := h.service.Upsert(r.Context(), CreateInput{
		EnvironmentID: environmentID,
		Name:          req.Name,
		Channel:       req.Channel,
		Subject:       req.Subject,
		Body:          req.Body,
	})
	if err != nil {
		http.Error(w, "failed to upsert template", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(templateResponse{
		ID: t.ID, EnvironmentID: t.EnvironmentID, Name: t.Name, Channel: t.Channel,
		Subject: t.Subject, Body: t.Body, Version: t.Version, IsActive: t.IsActive,
		CreatedAt: formatTimestamptz(t.CreatedAt), UpdatedAt: formatTimestamptz(t.UpdatedAt),
	})
}

func (h *Handler) get(w http.ResponseWriter, r *http.Request) {
	environmentID, ok := authctx.GetEnvironmentID(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "templateID"))
	if err != nil {
		http.Error(w, "invalid template id", http.StatusBadRequest)
		return
	}
	t, err := h.service.GetByID(r.Context(), id, environmentID)
	if err != nil {
		http.Error(w, "template not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(templateResponse{
		ID: t.ID, EnvironmentID: t.EnvironmentID, Name: t.Name, Channel: t.Channel,
		Subject: t.Subject, Body: t.Body, Version: t.Version, IsActive: t.IsActive,
		CreatedAt: formatTimestamptz(t.CreatedAt), UpdatedAt: formatTimestamptz(t.UpdatedAt),
	})
}

func (h *Handler) update(w http.ResponseWriter, r *http.Request) {
	environmentID, ok := authctx.GetEnvironmentID(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "templateID"))
	if err != nil {
		http.Error(w, "invalid template id", http.StatusBadRequest)
		return
	}
	var req updateRequest
	if !validate.DecodeAndRespond(w, r, &req) {
		return
	}
	t, err := h.service.Update(r.Context(), UpdateInput{ID: id, EnvironmentID: environmentID, Subject: req.Subject, Body: req.Body})
	if err != nil {
		http.Error(w, "template not found or update failed", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(templateResponse{
		ID: t.ID, EnvironmentID: t.EnvironmentID, Name: t.Name, Channel: t.Channel,
		Subject: t.Subject, Body: t.Body, Version: t.Version, IsActive: t.IsActive,
		CreatedAt: formatTimestamptz(t.CreatedAt), UpdatedAt: formatTimestamptz(t.UpdatedAt),
	})
}

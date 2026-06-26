package templates

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/deveasyclick/iwifunni/internal/shared/validate"
	"github.com/deveasyclick/iwifunni/internal/shared/authctx"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) Register(r chi.Router) {
	h.RegisterDashboardRoutes(r)
	h.RegisterAPIRoutes(r)
}

func (h *Handler) RegisterDashboardRoutes(r chi.Router) {
	r.Post("/templates", h.create)
	r.Post("/templates/upsert", h.upsert)
	r.Get("/templates", h.list)
	r.Get("/templates/{templateID}", h.get)
	r.Patch("/templates/{templateID}", h.update)
	r.Delete("/templates/{templateID}", h.delete)
}

func (h *Handler) RegisterAPIRoutes(r chi.Router) {
	r.Post("/templates/render", h.render)
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

type renderRequest struct {
	TemplateID uuid.UUID      `json:"template_id" validate:"required"`
	Variables  map[string]any `json:"variables"`
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

func (h *Handler) create(w http.ResponseWriter, r *http.Request) {
	environmentID, ok := authctx.GetEnvironmentID(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	var req createRequest
	if !validate.DecodeAndRespond(w, r, &req) {
		return
	}
	t, err := h.service.Create(r.Context(), CreateInput{
		EnvironmentID: environmentID,
		Name:          req.Name,
		Channel:       req.Channel,
		Subject:       req.Subject,
		Body:          req.Body,
	})
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			http.Error(w, "a template with this name and channel already exists", http.StatusConflict)
			return
		}
		http.Error(w, "failed to create template", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(templateResponse{
		ID: t.ID, EnvironmentID: t.EnvironmentID, Name: t.Name, Channel: t.Channel,
		Subject: t.Subject, Body: t.Body, Version: t.Version, IsActive: t.IsActive,
		CreatedAt: t.CreatedAt.Time.String(), UpdatedAt: t.UpdatedAt.Time.String(),
	})
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
		CreatedAt: t.CreatedAt.Time.String(), UpdatedAt: t.UpdatedAt.Time.String(),
	})
}

func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	environmentID, ok := authctx.GetEnvironmentID(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	items, err := h.service.List(r.Context(), environmentID)
	if err != nil {
		http.Error(w, "failed to list templates", http.StatusInternalServerError)
		return
	}
	resp := make([]templateResponse, 0, len(items))
	for _, t := range items {
		resp = append(resp, templateResponse{
			ID: t.ID, EnvironmentID: t.EnvironmentID, Name: t.Name, Channel: t.Channel,
			Subject: t.Subject, Body: t.Body, Version: t.Version, IsActive: t.IsActive,
			CreatedAt: t.CreatedAt.Time.String(), UpdatedAt: t.UpdatedAt.Time.String(),
		})
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
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
		CreatedAt: t.CreatedAt.Time.String(), UpdatedAt: t.UpdatedAt.Time.String(),
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
		CreatedAt: t.CreatedAt.Time.String(), UpdatedAt: t.UpdatedAt.Time.String(),
	})
}

func (h *Handler) delete(w http.ResponseWriter, r *http.Request) {
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
	if err := h.service.Delete(r.Context(), id, environmentID); err != nil {
		http.Error(w, "failed to delete template", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) render(w http.ResponseWriter, r *http.Request) {
	environmentID, ok := authctx.GetEnvironmentID(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	var req renderRequest
	if !validate.DecodeAndRespond(w, r, &req) {
		return
	}
	if req.Variables == nil {
		req.Variables = make(map[string]any)
	}
	t, err := h.service.GetByID(r.Context(), req.TemplateID, environmentID)
	if err != nil {
		http.Error(w, "template not found", http.StatusNotFound)
		return
	}
	subject := ""
	if t.Subject != nil {
		subject = *t.Subject
	}
	rendered, err := h.service.Render(subject, t.Body, req.Variables)
	if err != nil {
		http.Error(w, "failed to render template: "+err.Error(), http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"subject": rendered.Subject, "body": rendered.Body})
}

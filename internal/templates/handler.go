package templates

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
	r.Post("/templates", h.create)
	r.Get("/templates", h.list)
	r.Post("/templates/render", h.render) // before /{templateID}
	r.Get("/templates/{templateID}", h.get)
	r.Patch("/templates/{templateID}", h.update)
	r.Delete("/templates/{templateID}", h.delete)
}

type createRequest struct {
	Name    string  `json:"name"`
	Channel string  `json:"channel"`
	Subject *string `json:"subject"`
	Body    string  `json:"body"`
}

type updateRequest struct {
	Subject *string `json:"subject"`
	Body    string  `json:"body"`
}

type renderRequest struct {
	TemplateID uuid.UUID      `json:"template_id"`
	Variables  map[string]any `json:"variables"`
}

type templateResponse struct {
	ID        uuid.UUID `json:"id"`
	ProjectID uuid.UUID `json:"project_id"`
	Name      string    `json:"name"`
	Channel   string    `json:"channel"`
	Subject   *string   `json:"subject"`
	Body      string    `json:"body"`
	Version   int32     `json:"version"`
	IsActive  bool      `json:"is_active"`
	CreatedAt string    `json:"created_at"`
	UpdatedAt string    `json:"updated_at"`
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
	if req.Name == "" || req.Body == "" || req.Channel == "" {
		http.Error(w, "name, body, and channel are required", http.StatusBadRequest)
		return
	}
	switch req.Channel {
	case "email", "sms", "push":
	default:
		http.Error(w, "channel must be email, sms, or push", http.StatusBadRequest)
		return
	}
	t, err := h.service.Create(r.Context(), CreateInput{
		ProjectID: proj.ProjectID,
		Name:      req.Name,
		Channel:   req.Channel,
		Subject:   req.Subject,
		Body:      req.Body,
	})
	if err != nil {
		http.Error(w, "failed to create template", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(templateResponse{
		ID: t.ID, ProjectID: t.ProjectID, Name: t.Name, Channel: t.Channel,
		Subject: t.Subject, Body: t.Body, Version: t.Version, IsActive: t.IsActive,
		CreatedAt: t.CreatedAt.Time.String(), UpdatedAt: t.UpdatedAt.Time.String(),
	})
}

func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	proj := auth.GetAuthenticatedProject(r.Context())
	if proj == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	items, err := h.service.List(r.Context(), proj.ProjectID)
	if err != nil {
		http.Error(w, "failed to list templates", http.StatusInternalServerError)
		return
	}
	resp := make([]templateResponse, 0, len(items))
	for _, t := range items {
		resp = append(resp, templateResponse{
			ID: t.ID, ProjectID: t.ProjectID, Name: t.Name, Channel: t.Channel,
			Subject: t.Subject, Body: t.Body, Version: t.Version, IsActive: t.IsActive,
			CreatedAt: t.CreatedAt.Time.String(), UpdatedAt: t.UpdatedAt.Time.String(),
		})
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}

func (h *Handler) get(w http.ResponseWriter, r *http.Request) {
	proj := auth.GetAuthenticatedProject(r.Context())
	if proj == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "templateID"))
	if err != nil {
		http.Error(w, "invalid template id", http.StatusBadRequest)
		return
	}
	t, err := h.service.GetByID(r.Context(), id, proj.ProjectID)
	if err != nil {
		http.Error(w, "template not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(templateResponse{
		ID: t.ID, ProjectID: t.ProjectID, Name: t.Name, Channel: t.Channel,
		Subject: t.Subject, Body: t.Body, Version: t.Version, IsActive: t.IsActive,
		CreatedAt: t.CreatedAt.Time.String(), UpdatedAt: t.UpdatedAt.Time.String(),
	})
}

func (h *Handler) update(w http.ResponseWriter, r *http.Request) {
	proj := auth.GetAuthenticatedProject(r.Context())
	if proj == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "templateID"))
	if err != nil {
		http.Error(w, "invalid template id", http.StatusBadRequest)
		return
	}
	var req updateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}
	if req.Body == "" {
		http.Error(w, "body is required", http.StatusBadRequest)
		return
	}
	t, err := h.service.Update(r.Context(), UpdateInput{ID: id, ProjectID: proj.ProjectID, Subject: req.Subject, Body: req.Body})
	if err != nil {
		http.Error(w, "template not found or update failed", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(templateResponse{
		ID: t.ID, ProjectID: t.ProjectID, Name: t.Name, Channel: t.Channel,
		Subject: t.Subject, Body: t.Body, Version: t.Version, IsActive: t.IsActive,
		CreatedAt: t.CreatedAt.Time.String(), UpdatedAt: t.UpdatedAt.Time.String(),
	})
}

func (h *Handler) delete(w http.ResponseWriter, r *http.Request) {
	proj := auth.GetAuthenticatedProject(r.Context())
	if proj == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "templateID"))
	if err != nil {
		http.Error(w, "invalid template id", http.StatusBadRequest)
		return
	}
	if err := h.service.Delete(r.Context(), id, proj.ProjectID); err != nil {
		http.Error(w, "failed to delete template", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) render(w http.ResponseWriter, r *http.Request) {
	proj := auth.GetAuthenticatedProject(r.Context())
	if proj == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	var req renderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}
	if req.TemplateID == uuid.Nil {
		http.Error(w, "template_id is required", http.StatusBadRequest)
		return
	}
	if req.Variables == nil {
		req.Variables = make(map[string]any)
	}
	t, err := h.service.GetByID(r.Context(), req.TemplateID, proj.ProjectID)
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

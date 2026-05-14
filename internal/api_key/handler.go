package apikey

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
	r.Get("/api-keys", h.list)
	r.Post("/api-keys", h.create)
	r.Post("/api-keys/{keyID}/rotate", h.rotate)
	r.Delete("/api-keys/{keyID}", h.revoke)
	r.Patch("/api-keys/{keyID}", h.update)
}

type createRequest struct {
	Name   string   `json:"name"`
	Scopes []string `json:"scopes,omitempty"`
}

type apiKeyResponse struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	KeyPrefix string    `json:"key_prefix"`
	Scopes    []string  `json:"scopes"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

type createResponse struct {
	apiKeyResponse
	Key string `json:"key"`
}

func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	projectID, ok := projectIDFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	keys, err := h.service.List(r.Context(), projectID)
	if err != nil {
		http.Error(w, "failed to list api keys", http.StatusInternalServerError)
		return
	}
	resp := make([]apiKeyResponse, 0, len(keys))
	for _, k := range keys {
		resp = append(resp, apiKeyResponse{ID: k.ID, Name: k.Name, KeyPrefix: k.KeyPrefix, Scopes: k.Scopes, Status: k.Status, CreatedAt: k.CreatedAt})
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}

func (h *Handler) create(w http.ResponseWriter, r *http.Request) {
	projectID, ok := projectIDFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	var req createRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}
	if req.Name == "" {
		http.Error(w, "name is required", http.StatusBadRequest)
		return
	}
	k, err := h.service.Create(r.Context(), projectID, req.Name, req.Scopes)
	if err != nil {
		http.Error(w, "failed to create api key", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(createResponse{
		apiKeyResponse: apiKeyResponse{ID: k.ID, Name: k.Name, KeyPrefix: k.KeyPrefix, Scopes: k.Scopes, Status: k.Status, CreatedAt: k.CreatedAt},
		Key:            k.Key,
	})
}

func (h *Handler) rotate(w http.ResponseWriter, r *http.Request) {
	projectID, ok := projectIDFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	keyID, err := uuid.Parse(chi.URLParam(r, "keyID"))
	if err != nil {
		http.Error(w, "invalid key id", http.StatusBadRequest)
		return
	}
	k, err := h.service.Rotate(r.Context(), projectID, keyID)
	if err != nil {
		http.Error(w, "failed to rotate api key", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(createResponse{
		apiKeyResponse: apiKeyResponse{ID: k.ID, Name: k.Name, KeyPrefix: k.KeyPrefix, Scopes: k.Scopes, Status: k.Status, CreatedAt: k.CreatedAt},
		Key:            k.Key,
	})
}

func (h *Handler) revoke(w http.ResponseWriter, r *http.Request) {
	projectID, ok := projectIDFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	keyID, err := uuid.Parse(chi.URLParam(r, "keyID"))
	if err != nil {
		http.Error(w, "invalid key id", http.StatusBadRequest)
		return
	}
	if err := h.service.Revoke(r.Context(), projectID, keyID); err != nil {
		http.Error(w, "failed to revoke api key", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

type updateRequest struct {
	Status string `json:"status"`
}

func (h *Handler) update(w http.ResponseWriter, r *http.Request) {
	projectID, ok := projectIDFromContext(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	keyID, err := uuid.Parse(chi.URLParam(r, "keyID"))
	if err != nil {
		http.Error(w, "invalid key id", http.StatusBadRequest)
		return
	}
	var req updateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}
	if req.Status != "active" && req.Status != "disabled" {
		http.Error(w, "invalid status", http.StatusBadRequest)
		return
	}
	if err := h.service.UpdateStatus(r.Context(), projectID, keyID, req.Status); err != nil {
		http.Error(w, "failed to update api key", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"status": req.Status})
}

func projectIDFromContext(r *http.Request) (uuid.UUID, bool) {
	if claims := auth.GetJWTClaims(r.Context()); claims != nil {
		id, err := uuid.Parse(claims.ProjectID)
		if err == nil {
			return id, true
		}
	}

	if proj := auth.GetAuthenticatedProject(r.Context()); proj != nil {
		return proj.ProjectID, true
	}

	return uuid.Nil, false
}

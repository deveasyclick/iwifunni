package apikey

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/deveasyclick/iwifunni/internal/shared/validate"
	"github.com/deveasyclick/iwifunni/internal/shared/authctx"
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
	r.Delete("/api-keys/{keyID}", h.delete)
}

type createRequest struct {
	Name string `json:"name" validate:"required"`
}

type apiKeyResponse struct {
	ID         uuid.UUID  `json:"id"`
	Name       string     `json:"name"`
	KeyPrefix  string     `json:"key_prefix"`
	LastUsedAt *time.Time `json:"last_used_at"`
	CreatedAt  time.Time  `json:"created_at"`
}

type createResponse struct {
	apiKeyResponse
	Key string `json:"key"`
}

// @Summary      List API keys
// @Description  Get all API keys for the authenticated environment
// @Tags         API Keys
// @Produce      json
// @Success      200  {array}   apiKeyResponse
// @Failure      401  {string}  string  "Unauthorized"
// @Router       /api-keys [get]
// @Security     BearerAuth
func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	environmentID, ok := authctx.GetEnvironmentID(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	keys, err := h.service.List(r.Context(), environmentID)
	if err != nil {
		http.Error(w, "failed to list api keys", http.StatusInternalServerError)
		return
	}
	resp := make([]apiKeyResponse, 0, len(keys))
	for _, k := range keys {
		resp = append(resp, apiKeyResponse{ID: k.ID, Name: k.Name, KeyPrefix: k.KeyPrefix, LastUsedAt: k.LastUsedAt, CreatedAt: k.CreatedAt})
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}

// @Summary      Create API key
// @Description  Create a new API key for machine-to-machine auth
// @Tags         API Keys
// @Accept       json
// @Produce      json
// @Param        body  body  createRequest  true  "API key name and scopes"
// @Success      201   {object}  createResponse
// @Failure      401   {string}  string  "Unauthorized"
// @Router       /api-keys [post]
// @Security     BearerAuth
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
	k, err := h.service.Create(r.Context(), environmentID, req.Name)
	if err != nil {
		http.Error(w, "failed to create api key", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(createResponse{
		apiKeyResponse: apiKeyResponse{ID: k.ID, Name: k.Name, KeyPrefix: k.KeyPrefix, LastUsedAt: k.LastUsedAt, CreatedAt: k.CreatedAt},
		Key:            k.Key,
	})
}

// @Summary      Delete API key
// @Description  Permanently delete an API key
// @Tags         API Keys
// @Param        keyID  path  string  true  "API key ID"
// @Success      204    {string}  string  "No content"
// @Failure      400    {string}  string  "Invalid key ID"
// @Failure      401    {string}  string  "Unauthorized"
// @Router       /api-keys/{keyID} [delete]
// @Security     BearerAuth
func (h *Handler) delete(w http.ResponseWriter, r *http.Request) {
	environmentID, ok := authctx.GetEnvironmentID(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	keyID, err := uuid.Parse(chi.URLParam(r, "keyID"))
	if err != nil {
		http.Error(w, "invalid key id", http.StatusBadRequest)
		return
	}
	if err := h.service.Delete(r.Context(), environmentID, keyID); err != nil {
		http.Error(w, "failed to delete api key", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}



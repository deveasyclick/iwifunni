package provider

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/deveasyclick/iwifunni/internal/auth"
	"github.com/deveasyclick/iwifunni/internal/db"
	"github.com/deveasyclick/iwifunni/internal/providers/catalog"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type userStore interface {
	GetUserByID(ctx context.Context, id uuid.UUID) (db.GetUserByIDRow, error)
}

type Handler struct {
	service   *Service
	userStore userStore
}

func NewHandler(service *Service, us userStore) *Handler {
	return &Handler{service: service, userStore: us}
}

func (h *Handler) Register(r chi.Router) {
	r.Post("/providers", h.create)
	r.Get("/providers", h.list)
	r.Get("/providers/{providerID}", h.get)
	r.Put("/providers/{providerID}", h.update)
	r.Patch("/providers/{providerID}", h.updateState)
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

type updateStateRequest struct {
	Action string `json:"action"`
}

func (h *Handler) create(w http.ResponseWriter, r *http.Request) {
	environmentID, ok := auth.GetEnvironmentID(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	var req createRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}
	if req.Name == "" || req.Channel == "" {
		http.Error(w, "name and channel are required", http.StatusBadRequest)
		return
	}

	// For the demo email provider, automatically inject the logged-in user's email
	// address so no manual configuration is required.
	if strings.EqualFold(req.Name, "demo-email") {
		claims := auth.GetJWTClaims(r.Context())
		if claims == nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		userID, parseErr := uuid.Parse(claims.UserID)
		if parseErr != nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		user, fetchErr := h.userStore.GetUserByID(r.Context(), userID)
		if fetchErr != nil {
			http.Error(w, "failed to resolve user email", http.StatusInternalServerError)
			return
		}
		if req.Config == nil {
			req.Config = make(map[string]any)
		}
		req.Config["owner_email"] = user.Email
	}

	p, err := h.service.Create(r.Context(), CreateInput{
		EnvironmentID: environmentID,
		Name:          req.Name,
		Channel:       req.Channel,
		Credentials:   req.Credentials,
		Config:        req.Config,
	})
	if err != nil {
		writeProviderError(w, err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(providerResponseFromRecord(p))
}

func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	environmentID, ok := auth.GetEnvironmentID(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	providers, err := h.service.List(r.Context(), environmentID)
	if err != nil {
		http.Error(w, "failed to list providers", http.StatusInternalServerError)
		return
	}
	result := make([]providerResponse, 0, len(providers))
	for _, p := range providers {
		result = append(result, providerResponseFromRecord(p))
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(result)
}

func (h *Handler) get(w http.ResponseWriter, r *http.Request) {
	environmentID, ok := auth.GetEnvironmentID(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	providerID, err := uuid.Parse(chi.URLParam(r, "providerID"))
	if err != nil {
		http.Error(w, "invalid provider id", http.StatusBadRequest)
		return
	}
	p, err := h.service.GetByID(r.Context(), providerID, environmentID)
	if err != nil {
		http.Error(w, "provider not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(providerResponseFromRecord(p))
}

func (h *Handler) update(w http.ResponseWriter, r *http.Request) {
	environmentID, ok := auth.GetEnvironmentID(r.Context())
	if !ok {
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
		ID:            providerID,
		EnvironmentID: environmentID,
		Name:          req.Name,
		Channel:       req.Channel,
		Credentials:   req.Credentials,
		Config:        req.Config,
	})
	if err != nil {
		writeProviderError(w, err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(providerResponseFromRecord(p))
}

func (h *Handler) delete(w http.ResponseWriter, r *http.Request) {
	environmentID, ok := auth.GetEnvironmentID(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	providerID, err := uuid.Parse(chi.URLParam(r, "providerID"))
	if err != nil {
		http.Error(w, "invalid provider id", http.StatusBadRequest)
		return
	}
	if err := h.service.Delete(r.Context(), providerID, environmentID); err != nil {
		http.Error(w, "failed to delete provider", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) updateState(w http.ResponseWriter, r *http.Request) {
	environmentID, ok := auth.GetEnvironmentID(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	providerID, err := uuid.Parse(chi.URLParam(r, "providerID"))
	if err != nil {
		http.Error(w, "invalid provider id", http.StatusBadRequest)
		return
	}

	var req updateStateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}

	p, err := h.service.UpdateState(r.Context(), StateInput{
		ID:            providerID,
		EnvironmentID: environmentID,
		Action:        StateAction(req.Action),
	})
	if err != nil {
		writeProviderError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(providerResponseFromRecord(p))
}

type providerResponse struct {
	ID             uuid.UUID      `json:"id"`
	EnvironmentID  uuid.UUID      `json:"environment_id"`
	Name           string         `json:"name"`
	Channel        string         `json:"channel"`
	Config         map[string]any `json:"config,omitempty"`
	HasCredentials bool           `json:"has_credentials"`
	IsActive       bool           `json:"is_active"`
	IsPrimary      bool           `json:"is_primary"`
	CreatedAt      any            `json:"created_at"`
	UpdatedAt      any            `json:"updated_at,omitempty"`
}

func providerResponseFromRecord(p db.Provider) providerResponse {
	var config map[string]any
	if len(p.Config) > 0 {
		_ = json.Unmarshal(p.Config, &config)
	}

	return providerResponse{
		ID:             p.ID,
		EnvironmentID:  p.EnvironmentID,
		Name:           p.Name,
		Channel:        p.Channel,
		Config:         config,
		HasCredentials: len(p.Credentials) > 0,
		IsActive:       p.IsActive,
		IsPrimary:      p.IsPrimary,
		CreatedAt:      p.CreatedAt,
		UpdatedAt:      p.UpdatedAt,
	}
}

func writeProviderError(w http.ResponseWriter, err error) {
	var validationErr *catalog.ValidationError
	switch {
	case errors.Is(err, ErrUnsupportedProvider):
		http.Error(w, "unsupported provider", http.StatusBadRequest)
	case errors.As(err, &validationErr):
		http.Error(w, validationErr.Error(), http.StatusBadRequest)
	default:
		http.Error(w, "failed to save provider", http.StatusInternalServerError)
	}
}

package integration

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/deveasyclick/iwifunni/internal/shared/validate"
	"github.com/deveasyclick/iwifunni/internal/shared/authctx"
	"github.com/deveasyclick/iwifunni/internal/db/gen"
	"github.com/deveasyclick/iwifunni/internal/providers/catalog"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type userStore interface {
	GetUserByID(ctx context.Context, id uuid.UUID) (db.User, error)
}

type Handler struct {
	service       *Service
	userStore     userStore
	brevoAPIKey   string
	brevoFromEmail string
}

func NewHandler(service *Service, us userStore, brevoAPIKey, brevoFromEmail string) *Handler {
	return &Handler{
		service:        service,
		userStore:      us,
		brevoAPIKey:    brevoAPIKey,
		brevoFromEmail: brevoFromEmail,
	}
}

func (h *Handler) Register(r chi.Router) {
	r.Post("/integrations", h.create)
	r.Get("/integrations", h.list)
	r.Get("/integrations/{providerID}", h.get)
	r.Put("/integrations/{providerID}", h.update)
	r.Patch("/integrations/{providerID}", h.updateState)
	r.Delete("/integrations/{providerID}", h.delete)
}

type createRequest struct {
	Name        string         `json:"name" validate:"required"`
	Channel     string         `json:"channel" validate:"required"`
	Credentials map[string]any `json:"credentials" validate:"required"`
	Config      map[string]any `json:"config,omitempty"`
}

type updateRequest struct {
	Name        string         `json:"name" validate:"required"`
	Channel     string         `json:"channel" validate:"required"`
	Credentials map[string]any `json:"credentials" validate:"required"`
	Config      map[string]any `json:"config,omitempty"`
}

type updateStateRequest struct {
	Action string `json:"action" validate:"required"`
}

// @Summary      Create integration
// @Description  Connect a notification provider (SendGrid, Brevo, SMTP, etc.)
// @Tags         Integrations
// @Accept       json
// @Produce      json
// @Param        body  body  createRequest  true  "Provider credentials and config"
// @Success      201   {object}  providerResponse
// @Failure      400   {string}  string  "Invalid input or unsupported provider"
// @Failure      401   {string}  string  "Unauthorized"
// @Router       /integrations [post]
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

	// For the demo email provider, automatically inject the logged-in user's email
	// address so no manual configuration is required.
	if strings.EqualFold(req.Name, "demo-email") {
		claims := authctx.GetJWTClaims(r.Context())
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
		if h.brevoAPIKey != "" && h.brevoFromEmail != "" {
			req.Config["brevo_api_key"] = h.brevoAPIKey
			req.Config["brevo_from_email"] = h.brevoFromEmail
		}
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

// @Summary      List integrations
// @Description  Get all connected notification providers
// @Tags         Integrations
// @Produce      json
// @Success      200  {array}   providerResponse
// @Failure      401  {string}  string  "Unauthorized"
// @Router       /integrations [get]
// @Security     BearerAuth
func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	environmentID, ok := authctx.GetEnvironmentID(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	integrations, err := h.service.List(r.Context(), environmentID)
	if err != nil {
		http.Error(w, "failed to list integrations", http.StatusInternalServerError)
		return
	}
	result := make([]providerResponse, 0, len(integrations))
	for _, p := range integrations {
		result = append(result, providerResponseFromRecord(p))
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(result)
}

// @Summary      Get integration
// @Description  Get a specific notification provider by ID
// @Tags         Integrations
// @Produce      json
// @Param        providerID  path  string  true  "Integration ID"
// @Success      200         {object}  providerResponse
// @Failure      400         {string}  string  "Invalid ID"
// @Failure      404         {string}  string  "Not found"
// @Router       /integrations/{providerID} [get]
// @Security     BearerAuth
func (h *Handler) get(w http.ResponseWriter, r *http.Request) {
	environmentID, ok := authctx.GetEnvironmentID(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	providerID, err := uuid.Parse(chi.URLParam(r, "providerID"))
	if err != nil {
		http.Error(w, "invalid integration id", http.StatusBadRequest)
		return
	}
	p, err := h.service.GetByID(r.Context(), providerID, environmentID)
	if err != nil {
		http.Error(w, "integration not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(providerResponseFromRecord(p))
}

// @Summary      Update integration
// @Description  Update a connected provider's credentials and config
// @Tags         Integrations
// @Accept       json
// @Produce      json
// @Param        providerID  path  string  true  "Integration ID"
// @Param        body        body  updateRequest  true  "Updated provider config"
// @Success      200         {object}  providerResponse
// @Failure      400         {string}  string  "Invalid input"
// @Router       /integrations/{providerID} [put]
// @Security     BearerAuth
func (h *Handler) update(w http.ResponseWriter, r *http.Request) {
	environmentID, ok := authctx.GetEnvironmentID(r.Context())
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
	if !validate.DecodeAndRespond(w, r, &req) {
		return
	}

	// Inject Brevo credentials for demo-email on update as well
	if strings.EqualFold(req.Name, "demo-email") {
		if req.Config == nil {
			req.Config = make(map[string]any)
		}
		if h.brevoAPIKey != "" && h.brevoFromEmail != "" {
			req.Config["brevo_api_key"] = h.brevoAPIKey
			req.Config["brevo_from_email"] = h.brevoFromEmail
		}
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

// @Summary      Delete integration
// @Description  Remove a connected notification provider
// @Tags         Integrations
// @Param        providerID  path  string  true  "Integration ID"
// @Success      204         {string}  string  "No content"
// @Failure      400         {string}  string  "Invalid ID"
// @Router       /integrations/{providerID} [delete]
// @Security     BearerAuth
func (h *Handler) delete(w http.ResponseWriter, r *http.Request) {
	environmentID, ok := authctx.GetEnvironmentID(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	providerID, err := uuid.Parse(chi.URLParam(r, "providerID"))
	if err != nil {
		http.Error(w, "invalid integration id", http.StatusBadRequest)
		return
	}
	if err := h.service.Delete(r.Context(), providerID, environmentID); err != nil {
		http.Error(w, "failed to delete integration", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// @Summary      Update integration state
// @Description  Enable, disable, or set a provider as primary
// @Tags         Integrations
// @Accept       json
// @Produce      json
// @Param        providerID  path  string  true  "Integration ID"
// @Param        body        body  updateStateRequest  true  "Action: enable, disable, or set_primary"
// @Success      200         {object}  providerResponse
// @Failure      400         {string}  string  "Invalid input or action"
// @Router       /integrations/{providerID} [patch]
// @Security     BearerAuth
func (h *Handler) updateState(w http.ResponseWriter, r *http.Request) {
	environmentID, ok := authctx.GetEnvironmentID(r.Context())
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
	if !validate.DecodeAndRespond(w, r, &req) {
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

func providerResponseFromRecord(p db.Integration) providerResponse {
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

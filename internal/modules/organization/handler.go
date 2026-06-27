package organization

import (
	"encoding/json"
	"net/http"

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
	r.Post("/organizations", h.create)
	r.Get("/organizations", h.list)
	r.Get("/organizations/{orgID}", h.get)
}

type createRequest struct {
	Name string `json:"name" validate:"required"`
}

// @Summary      Create organization
// @Description  Create a new organization for the authenticated user
// @Tags         Organizations
// @Accept       json
// @Produce      json
// @Param        body  body  createRequest  true  "Organization name"
// @Success      201   {object}  any
// @Failure      400   {string}  string  "Invalid input"
// @Failure      401   {string}  string  "Unauthorized"
// @Router       /organizations [post]
// @Security     BearerAuth
func (h *Handler) create(w http.ResponseWriter, r *http.Request) {
	// JWT auth: get user from context
	userID, ok := getUserID(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	var req createRequest
	if !validate.DecodeAndRespond(w, r, &req) {
		return
	}
	org, err := h.service.Create(r.Context(), CreateInput{Name: req.Name, UserID: userID})
	if err != nil {
		http.Error(w, "failed to create organization", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(org)
}

// @Summary      List organizations
// @Description  Get all organizations for the authenticated user
// @Tags         Organizations
// @Produce      json
// @Success      200  {array}   any
// @Failure      401  {string}  string  "Unauthorized"
// @Router       /organizations [get]
// @Security     BearerAuth
func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	userID, ok := getUserID(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	orgs, err := h.service.ListByUser(r.Context(), userID)
	if err != nil {
		http.Error(w, "failed to list organizations", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(orgs)
}

// @Summary      Get organization
// @Description  Get a single organization by ID
// @Tags         Organizations
// @Produce      json
// @Param        orgID  path  string  true  "Organization ID"
// @Success      200    {object}  any
// @Failure      400    {string}  string  "Invalid ID"
// @Failure      401    {string}  string  "Unauthorized"
// @Failure      404    {string}  string  "Not found"
// @Router       /organizations/{orgID} [get]
// @Security     BearerAuth
func (h *Handler) get(w http.ResponseWriter, r *http.Request) {
	if _, ok := getUserID(r); !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	orgID, err := uuid.Parse(chi.URLParam(r, "orgID"))
	if err != nil {
		http.Error(w, "invalid organization id", http.StatusBadRequest)
		return
	}
	org, err := h.service.GetByID(r.Context(), orgID)
	if err != nil {
		http.Error(w, "organization not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(org)
}

// getUserID extracts the authenticated user ID from the JWT context.
func getUserID(r *http.Request) (uuid.UUID, bool) {
	claims := authctx.GetJWTClaims(r.Context())
	if claims == nil {
		return uuid.Nil, false
	}
	id, err := uuid.Parse(claims.UserID)
	if err != nil {
		return uuid.Nil, false
	}
	return id, true
}

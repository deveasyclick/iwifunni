package subscriber

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/deveasyclick/iwifunni/internal/shared/validate"
	"github.com/deveasyclick/iwifunni/internal/shared/authctx"
	"github.com/deveasyclick/iwifunni/internal/db/gen"
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
	r.Post("/subscribers", h.create)
	r.Get("/subscribers", h.list)
	r.Get("/subscribers/{subscriberID}", h.get)
	r.Put("/subscribers/{subscriberID}", h.update)
	r.Delete("/subscribers/{subscriberID}", h.delete)
}

type subscriberRequest struct {
	Name        string                 `json:"name"`
	Email       *string                `json:"email"`
	Phone       *string                `json:"phone"`
	PushToken   *string                `json:"pushToken"`
	Channels    []string               `json:"channels,omitempty"`
	Tags        []string               `json:"tags"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
	Preferences map[string]interface{} `json:"preferences,omitempty"`
}

type subscriberResponse struct {
	ID                   uuid.UUID              `json:"id"`
	Name                 string                 `json:"name"`
	Email                *string                `json:"email,omitempty"`
	Phone                *string                `json:"phone,omitempty"`
	PushToken            *string                `json:"pushToken,omitempty"`
	Channels             []string               `json:"channels"`
	Status               ChannelStatus          `json:"status"`
	Tags                 []string               `json:"tags"`
	Metadata             map[string]interface{} `json:"metadata,omitempty"`
	Preferences          map[string]interface{} `json:"preferences,omitempty"`
	SubscriptionDate     string                 `json:"subscriptionDate"`
	LastNotificationDate *string                `json:"lastNotificationDate,omitempty"`
	Deleted              bool                   `json:"deleted"`
	CreatedAt            string                 `json:"createdAt"`
	UpdatedAt            string                 `json:"updatedAt"`
}

func (h *Handler) create(w http.ResponseWriter, r *http.Request) {
	environmentID, ok := authctx.GetEnvironmentID(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	var req subscriberRequest
	if !validate.DecodeAndRespond(w, r, &req) {
		return
	}
	item, err := h.service.Create(r.Context(), CreateInput{
		EnvironmentID: environmentID,
		Name:          req.Name,
		Email:         req.Email,
		Phone:         req.Phone,
		PushToken:     req.PushToken,
		Channels:      req.Channels,
		Tags:          req.Tags,
		Metadata:      req.Metadata,
		Preferences:   req.Preferences,
	})
	if err != nil {
		h.respondError(w, err)
		return
	}
	h.writeJSON(w, http.StatusCreated, subscriberFromRecord(item))
}

func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	environmentID, ok := authctx.GetEnvironmentID(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	searchQuery := strings.TrimSpace(r.URL.Query().Get("search"))

	var items []db.Subscriber
	var err error
	if searchQuery != "" {
		items, err = h.service.Search(r.Context(), environmentID, searchQuery)
	} else {
		items, err = h.service.List(r.Context(), environmentID)
	}
	if err != nil {
		http.Error(w, "failed to list subscribers", http.StatusInternalServerError)
		return
	}
	response := make([]subscriberResponse, 0, len(items))
	for _, item := range items {
		response = append(response, subscriberFromRecord(item))
	}
	h.writeJSON(w, http.StatusOK, response)
}

func (h *Handler) get(w http.ResponseWriter, r *http.Request) {
	environmentID, ok := authctx.GetEnvironmentID(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "subscriberID"))
	if err != nil {
		http.Error(w, "invalid subscriber id", http.StatusBadRequest)
		return
	}
	item, err := h.service.GetByID(r.Context(), id, environmentID)
	if err != nil {
		h.respondError(w, err)
		return
	}
	h.writeJSON(w, http.StatusOK, subscriberFromRecord(item))
}

func (h *Handler) update(w http.ResponseWriter, r *http.Request) {
	environmentID, ok := authctx.GetEnvironmentID(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "subscriberID"))
	if err != nil {
		http.Error(w, "invalid subscriber id", http.StatusBadRequest)
		return
	}
	var req subscriberRequest
	if !validate.DecodeAndRespond(w, r, &req) {
		return
	}
	item, err := h.service.Update(r.Context(), UpdateInput{
		ID:            id,
		EnvironmentID: environmentID,
		Name:          req.Name,
		Email:         req.Email,
		Phone:         req.Phone,
		PushToken:     req.PushToken,
		Channels:      req.Channels,
		Tags:          req.Tags,
		Metadata:      req.Metadata,
		Preferences:   req.Preferences,
	})
	if err != nil {
		h.respondError(w, err)
		return
	}
	h.writeJSON(w, http.StatusOK, subscriberFromRecord(item))
}

func (h *Handler) delete(w http.ResponseWriter, r *http.Request) {
	environmentID, ok := authctx.GetEnvironmentID(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "subscriberID"))
	if err != nil {
		http.Error(w, "invalid subscriber id", http.StatusBadRequest)
		return
	}
	if err := h.service.Delete(r.Context(), id, environmentID); err != nil {
		h.respondError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) respondError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, ErrInvalidSubscriber):
		http.Error(w, "invalid subscriber payload", http.StatusBadRequest)
	case errors.Is(err, pgx.ErrNoRows):
		http.Error(w, "subscriber not found", http.StatusNotFound)
	default:
		http.Error(w, "subscriber request failed", http.StatusInternalServerError)
	}
}

func (h *Handler) writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func subscriberFromRecord(item db.Subscriber) subscriberResponse {
	status := ChannelStatus{}
	if len(item.Status) > 0 {
		_ = json.Unmarshal(item.Status, &status)
	}
	metadata := make(map[string]interface{})
	if len(item.Metadata) > 0 {
		_ = json.Unmarshal(item.Metadata, &metadata)
	}
	preferences := make(map[string]interface{})
	if len(item.Preferences) > 0 {
		_ = json.Unmarshal(item.Preferences, &preferences)
	}
	return subscriberResponse{
		ID:                   item.ID,
		Name:                 item.Name,
		Email:                item.Email,
		Phone:                item.Phone,
		PushToken:            item.PushToken,
		Channels:             item.Channels,
		Status:               status,
		Tags:                 item.Tags,
		Metadata:             metadata,
		Preferences:          preferences,
		SubscriptionDate:     formatTime(item.SubscriptionDate),
		LastNotificationDate: optionalTime(item.LastNotificationDate),
		Deleted:              item.DeletedAt.Valid,
		CreatedAt:            formatTime(item.CreatedAt),
		UpdatedAt:            formatTime(item.UpdatedAt),
	}
}

func formatTime(value pgtype.Timestamptz) string {
	if !value.Valid {
		return ""
	}
	return value.Time.UTC().Format(time.RFC3339)
}

func optionalTime(value pgtype.Timestamptz) *string {
	if !value.Valid {
		return nil
	}
	formatted := value.Time.UTC().Format(time.RFC3339)
	return &formatted
}

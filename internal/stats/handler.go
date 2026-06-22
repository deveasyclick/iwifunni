package stats

import (
	"encoding/json"
	"net/http"

	"github.com/deveasyclick/iwifunni/internal/auth"
	"github.com/go-chi/chi/v5"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) Register(r chi.Router) {
	r.Get("/stats", h.stats)
}

func (h *Handler) stats(w http.ResponseWriter, r *http.Request) {
	environmentID, ok := auth.GetEnvironmentID(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	stats, err := h.service.GetStats(r.Context(), environmentID)
	if err != nil {
		http.Error(w, "failed to load dashboard stats", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(stats)
}

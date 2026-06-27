package stats

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/deveasyclick/iwifunni/internal/shared/authctx"
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

var supportedDays = map[int]bool{
	7:   true,
	14:  true,
	30:  true,
	90:  true,
	180: true,
}

// @Summary      Get dashboard stats
// @Description  Get aggregated notification and subscriber statistics
// @Tags         Dashboard
// @Produce      json
// @Param        days  query  int  false  "Lookback period: 7, 14, 30, 90, or 180 (default 7)"
// @Success      200   {object}  any
// @Failure      400   {string}  string  "Invalid days parameter"
// @Failure      401   {string}  string  "Unauthorized"
// @Router       /stats [get]
// @Security     BearerAuth
func (h *Handler) stats(w http.ResponseWriter, r *http.Request) {
	environmentID, ok := authctx.GetEnvironmentID(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	days := 7
	if d := r.URL.Query().Get("days"); d != "" {
		parsed, err := strconv.Atoi(d)
		if err != nil || !supportedDays[parsed] {
			http.Error(w, "days must be one of: 7, 14, 30, 90, 180", http.StatusBadRequest)
			return
		}
		days = parsed
	}

	stats, err := h.service.GetStats(r.Context(), environmentID, days)
	if err != nil {
		http.Error(w, "failed to load dashboard stats", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(stats)
}

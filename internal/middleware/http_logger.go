package middleware

import (
	"net/http"
	"time"

	"github.com/deveasyclick/iwifunni/pkg/logger"
)

// HTTPLogger is an slog-based HTTP request logging middleware.
// 4XX responses are logged at WARN level; 5XX at ERROR with the response body captured.
func HTTPLogger(next http.Handler) http.Handler {
	log := logger.Get()
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		ww := &responseWriter{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(ww, r)

		attrs := []any{
			"method", r.Method,
			"path", r.URL.Path,
			"status", ww.status,
			"duration", time.Since(start),
			"remote", r.RemoteAddr,
		}

		switch {
		case ww.status >= 500:
			attrs = append(attrs, "error", string(ww.body))
			log.Error("http request", attrs...)
		case ww.status >= 400:
			log.Warn("http request", attrs...)
		default:
			log.Info("http request", attrs...)
		}
	})
}

type responseWriter struct {
	http.ResponseWriter
	status int
	body   []byte
}

func (rw *responseWriter) WriteHeader(status int) {
	rw.status = status
	rw.ResponseWriter.WriteHeader(status)
}

func (rw *responseWriter) Write(b []byte) (int, error) {
	if rw.status >= 400 {
		rw.body = append(rw.body, b...)
	}
	return rw.ResponseWriter.Write(b)
}

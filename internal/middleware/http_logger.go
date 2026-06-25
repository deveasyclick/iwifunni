package middleware

import (
	"net/http"
	"time"

	"github.com/deveasyclick/iwifunni/pkg/logger"
)

// HTTPLogger is a zerolog-based HTTP request logging middleware.
// 4XX responses are logged at WARN level; 5XX at ERROR with the response body captured.
func HTTPLogger(next http.Handler) http.Handler {
	log := logger.Get()
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		ww := &responseWriter{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(ww, r)

		ev := log.Info().
			Str("method", r.Method).
			Str("path", r.URL.Path).
			Int("status", ww.status).
			Dur("duration", time.Since(start)).
			Str("remote", r.RemoteAddr)

		switch {
		case ww.status >= 500:
			ev = log.Error().Str("error", string(ww.body)).Str("method", r.Method).
				Str("path", r.URL.Path).Int("status", ww.status).
				Dur("duration", time.Since(start)).Str("remote", r.RemoteAddr)
		case ww.status >= 400:
			ev = log.Warn().Str("method", r.Method).Str("path", r.URL.Path).
				Int("status", ww.status).Dur("duration", time.Since(start)).
				Str("remote", r.RemoteAddr)
		}

		ev.Msg("http request")
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

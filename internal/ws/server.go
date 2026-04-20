package ws

import (
	"net/http"
	"sync"

	"github.com/deveasyclick/iwifunni/pkg/logger"
	"github.com/gorilla/websocket"
)

type Server struct {
	upgrader websocket.Upgrader
	clients  map[*websocket.Conn]struct{}
	mu       sync.Mutex
}

type NotificationPayload struct {
	UserID  string            `json:"user_id"`
	Title   string            `json:"title"`
	Message string            `json:"message"`
	Meta    map[string]string `json:"metadata"`
}

func NewServer() *Server {
	return &Server{
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool { return true },
		},
		clients: make(map[*websocket.Conn]struct{}),
	}
}

func (s *Server) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := s.upgrader.Upgrade(w, r, nil)
	if err != nil {
		logger.Get().Error().Err(err).Msg("ws upgrade failed")
		return
	}

	s.mu.Lock()
	s.clients[conn] = struct{}{}
	s.mu.Unlock()

	logger.Get().Info().Msg("ws client connected")
	defer func() {
		s.mu.Lock()
		delete(s.clients, conn)
		s.mu.Unlock()
		conn.Close()
	}()

	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			break
		}
	}
}

func (s *Server) Broadcast(payload *NotificationPayload) {
	s.mu.Lock()
	defer s.mu.Unlock()

	for conn := range s.clients {
		if err := conn.WriteJSON(payload); err != nil {
			logger.Get().Error().Err(err).Msg("failed to write ws payload")
			conn.Close()
			delete(s.clients, conn)
		}
	}
}

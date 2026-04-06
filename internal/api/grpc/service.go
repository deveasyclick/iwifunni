package grpc

import (
	"context"
	"fmt"

	"github.com/deveasyclick/iwifunni/api/proto"
	"github.com/deveasyclick/iwifunni/internal/auth"
	"github.com/deveasyclick/iwifunni/internal/storage"
	"github.com/deveasyclick/iwifunni/internal/types"
	"github.com/deveasyclick/iwifunni/internal/worker"
	"github.com/rs/zerolog/log"
)

type Service struct {
    proto.UnimplementedNotificationServiceServer
    store      *storage.Store
    producer   *worker.Producer
    rateLimiter *auth.RateLimiter
}

func NewService(store *storage.Store, producer *worker.Producer, rateLimiter *auth.RateLimiter) *Service {
    return &Service{store: store, producer: producer, rateLimiter: rateLimiter}
}

func (s *Service) SendNotification(ctx context.Context, req *proto.SendNotificationRequest) (*proto.SendNotificationResponse, error) {
    if req.UserId == "" || req.Title == "" || req.Message == "" {
        return nil, fmt.Errorf("user_id, title and message are required")
    }

    svc, err := s.store.GetServiceByAPIKey(ctx, req.ApiKey)
    if err != nil {
        return nil, fmt.Errorf("invalid api key: %w", err)
    }

    ok, err := s.rateLimiter.Allow(ctx, svc.ID)
    if err != nil {
        log.Error().Err(err).Msg("rate limiter error")
        return nil, fmt.Errorf("rate limiter unavailable")
    }
    if !ok {
        return nil, fmt.Errorf("rate limit exceeded")
    }

    job := types.NotificationJob{
        ServiceID: svc.ID,
        UserID:    req.UserId,
        Title:     req.Title,
        Message:   req.Message,
        Channels:  req.Channels,
        Metadata:  req.Metadata,
    }
    if err := s.producer.Enqueue(ctx, &job); err != nil {
        return nil, fmt.Errorf("failed to queue notification: %w", err)
    }

    return &proto.SendNotificationResponse{JobId: job.JobID, Status: "queued"}, nil
}

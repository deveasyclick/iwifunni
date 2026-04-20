package grpc

import (
	"context"
	"fmt"

	"github.com/deveasyclick/iwifunni/api/proto"
	"github.com/deveasyclick/iwifunni/internal/auth"
	"github.com/deveasyclick/iwifunni/internal/db"
	"github.com/deveasyclick/iwifunni/internal/types"
	"github.com/deveasyclick/iwifunni/internal/worker"
	"github.com/deveasyclick/iwifunni/pkg/logger"
)

type Service struct {
	proto.UnimplementedNotificationServiceServer
	queries     *db.Queries
	producer    *worker.Producer
	rateLimiter *auth.RateLimiter
}

func NewService(queries *db.Queries, producer *worker.Producer, rateLimiter *auth.RateLimiter) *Service {
	return &Service{queries: queries, producer: producer, rateLimiter: rateLimiter}
}

func (s *Service) SendNotification(ctx context.Context, req *proto.SendNotificationRequest) (*proto.SendNotificationResponse, error) {
	if req.UserId == "" || req.Title == "" || req.Message == "" {
		return nil, fmt.Errorf("user_id, title and message are required")
	}

	svc, err := s.queries.GetServiceByAPIKey(ctx, req.ApiKey)
	if err != nil {
		return nil, fmt.Errorf("invalid api key: %w", err)
	}

	ok, err := s.rateLimiter.Allow(ctx, svc.ID.String())
	if err != nil {
		logger.Get().Error().Err(err).Msg("rate limiter error")
		return nil, fmt.Errorf("rate limiter unavailable")
	}
	if !ok {
		return nil, fmt.Errorf("rate limit exceeded")
	}

	job := types.NotificationJob{
		ServiceID: svc.ID.String(),
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

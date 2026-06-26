package notification

import (
	"context"
	"encoding/json"

	"github.com/deveasyclick/iwifunni/internal/db/gen"
	"github.com/google/uuid"
)

// GetByProjectWithAttempts returns a notification with its delivery attempts.
func (s *Service) GetByProjectWithAttempts(ctx context.Context, notificationID, projectID uuid.UUID) (*NotificationWithAttempts, error) {
	notification, err := s.GetByProject(ctx, notificationID, projectID)
	if err != nil {
		return nil, err
	}

	deliveryAttempts, err := s.GetDeliveryAttempts(ctx, notificationID)
	if err != nil {
		deliveryAttempts = nil
	}

	attempts := make([]map[string]any, 0, len(deliveryAttempts))
	for _, a := range deliveryAttempts {
		attrs := map[string]any{
			"id":          a.ID.String(),
			"channel":     a.Channel,
			"destination": a.Destination,
			"status":      a.Status,
		}
		if a.ErrorMessage != nil {
			attrs["error_message"] = *a.ErrorMessage
		}
		if a.ProviderMessageID != nil {
			attrs["provider_message_id"] = *a.ProviderMessageID
		}
		attempts = append(attempts, attrs)
	}

	return &NotificationWithAttempts{
		Notification:     notification,
		DeliveryAttempts: attempts,
	}, nil
}

func (s *Service) ListByProject(ctx context.Context, projectID uuid.UUID, includeTest bool) ([]NotificationView, error) {
	items, err := s.repo.ListByProject(ctx, projectID, includeTest)
	if err != nil {
		return nil, err
	}
	result := make([]NotificationView, 0, len(items))
	for _, item := range items {
		result = append(result, notificationViewFromRecord(item))
	}
	return result, nil
}

func (s *Service) ListByWorkflowID(ctx context.Context, projectID, workflowID uuid.UUID, limit int32) ([]NotificationView, error) {
	items, err := s.repo.ListByWorkflowID(ctx, projectID, workflowID, limit)
	if err != nil {
		return nil, err
	}
	result := make([]NotificationView, 0, len(items))
	for _, item := range items {
		result = append(result, notificationViewFromRecord(item))
	}
	return result, nil
}

func (s *Service) GetByProject(ctx context.Context, id, projectID uuid.UUID) (*NotificationView, error) {
	item, err := s.repo.GetByProject(ctx, id, projectID)
	if err != nil {
		return nil, err
	}
	view := notificationViewFromRecord(item)
	return &view, nil
}

func notificationViewFromRecord(item db.Notification) NotificationView {
	metadata := map[string]any{}
	if len(item.Metadata) > 0 {
		_ = json.Unmarshal(item.Metadata, &metadata)
	}

	var environmentID *string
	if item.EnvironmentID.Valid {
		value := uuid.UUID(item.EnvironmentID.Bytes).String()
		environmentID = &value
	}

	return NotificationView{
		ID:            item.ID.String(),
		EnvironmentID: environmentID,
		Title:         item.Title,
		Message:       item.Message,
		Channels:      item.Channels,
		Metadata:      metadata,
		Status:        item.Status,
		IsTest:        item.IsTest,
		CreatedAt:     item.CreatedAt.Time,
		UpdatedAt:     item.UpdatedAt.Time,
	}
}

func defaultProviderForChannel(channel string) string {
	switch channel {
	case "email":
		return "smtp"
	case "sms":
		return "termii"
	case "push":
		return "fcm"
	default:
		return ""
	}
}

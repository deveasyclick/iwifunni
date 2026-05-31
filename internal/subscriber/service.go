package subscriber

import (
	"context"
	"encoding/json"
	"errors"
	"strings"

	"github.com/deveasyclick/iwifunni/internal/db"
	"github.com/google/uuid"
)

var ErrInvalidSubscriber = errors.New("invalid subscriber")

type ChannelStatusValue string

const (
	StatusSubscribed   ChannelStatusValue = "subscribed"
	StatusUnsubscribed ChannelStatusValue = "unsubscribed"
	StatusBounced      ChannelStatusValue = "bounced"
)

type ChannelStatus struct {
	Email *ChannelStatusValue `json:"email,omitempty"`
	SMS   *ChannelStatusValue `json:"sms,omitempty"`
	Push  *ChannelStatusValue `json:"push,omitempty"`
}

type CreateInput struct {
	EnvironmentID uuid.UUID
	Name      string
	Email     *string
	Phone     *string
	PushToken *string
	Channels  []string
	Status    ChannelStatus
	Tags      []string
}

type UpdateInput struct {
	ID        uuid.UUID
	EnvironmentID uuid.UUID
	Name      string
	Email     *string
	Phone     *string
	PushToken *string
	Channels  []string
	Status    ChannelStatus
	Tags      []string
}

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) Create(ctx context.Context, in CreateInput) (db.Subscriber, error) {
	params, err := buildCreateParams(in)
	if err != nil {
		return db.Subscriber{}, err
	}
	return s.repo.Create(ctx, params)
}

func (s *Service) List(ctx context.Context, environmentID uuid.UUID) ([]db.Subscriber, error) {
	return s.repo.List(ctx, environmentID)
}

func (s *Service) GetByID(ctx context.Context, id, environmentID uuid.UUID) (db.Subscriber, error) {
	return s.repo.GetByID(ctx, id, environmentID)
}

func (s *Service) Update(ctx context.Context, in UpdateInput) (db.Subscriber, error) {
	params, err := buildUpdateParams(in)
	if err != nil {
		return db.Subscriber{}, err
	}
	return s.repo.Update(ctx, params)
}

func (s *Service) Delete(ctx context.Context, id, environmentID uuid.UUID) error {
	return s.repo.Delete(ctx, id, environmentID)
}

func buildCreateParams(in CreateInput) (db.CreateSubscriberParams, error) {
	name := strings.TrimSpace(in.Name)
	channels, err := normalizeChannels(in.Channels)
	if err != nil {
		return db.CreateSubscriberParams{}, err
	}
	email := trimOptional(in.Email)
	phone := trimOptional(in.Phone)
	pushToken := trimOptional(in.PushToken)
	if err := validateChannelTargets(channels, email, phone, pushToken); err != nil {
		return db.CreateSubscriberParams{}, err
	}
	statusJSON, err := buildStatusJSON(channels, in.Status)
	if err != nil {
		return db.CreateSubscriberParams{}, err
	}
	return db.CreateSubscriberParams{
		ID:            uuid.New(),
		EnvironmentID: in.EnvironmentID,
		Name:          name,
		Email:         email,
		Phone:         phone,
		PushToken:     pushToken,
		Channels:      channels,
		Status:        statusJSON,
		Tags:          normalizeTags(in.Tags),
		Metadata:      []byte(`{}`),
	}, validateName(name)
}

func buildUpdateParams(in UpdateInput) (db.UpdateSubscriberParams, error) {
	name := strings.TrimSpace(in.Name)
	channels, err := normalizeChannels(in.Channels)
	if err != nil {
		return db.UpdateSubscriberParams{}, err
	}
	email := trimOptional(in.Email)
	phone := trimOptional(in.Phone)
	pushToken := trimOptional(in.PushToken)
	if err := validateChannelTargets(channels, email, phone, pushToken); err != nil {
		return db.UpdateSubscriberParams{}, err
	}
	statusJSON, err := buildStatusJSON(channels, in.Status)
	if err != nil {
		return db.UpdateSubscriberParams{}, err
	}
	return db.UpdateSubscriberParams{
		ID:            in.ID,
		EnvironmentID: in.EnvironmentID,
		Name:          name,
		Email:         email,
		Phone:         phone,
		PushToken:     pushToken,
		Channels:      channels,
		Status:        statusJSON,
		Tags:          normalizeTags(in.Tags),
		Metadata:      []byte(`{}`),
	}, validateName(name)
}

func validateName(name string) error {
	if name == "" {
		return ErrInvalidSubscriber
	}
	return nil
}

func trimOptional(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func normalizeChannels(channels []string) ([]string, error) {
	if len(channels) == 0 {
		return nil, ErrInvalidSubscriber
	}
	seen := make(map[string]struct{}, len(channels))
	result := make([]string, 0, len(channels))
	for _, channel := range channels {
		normalized := strings.ToLower(strings.TrimSpace(channel))
		switch normalized {
		case "email", "sms", "push":
		default:
			return nil, ErrInvalidSubscriber
		}
		if _, ok := seen[normalized]; ok {
			continue
		}
		seen[normalized] = struct{}{}
		result = append(result, normalized)
	}
	if len(result) == 0 {
		return nil, ErrInvalidSubscriber
	}
	return result, nil
}

func normalizeTags(tags []string) []string {
	seen := make(map[string]struct{}, len(tags))
	result := make([]string, 0, len(tags))
	for _, tag := range tags {
		normalized := strings.TrimSpace(tag)
		if normalized == "" {
			continue
		}
		if _, ok := seen[normalized]; ok {
			continue
		}
		seen[normalized] = struct{}{}
		result = append(result, normalized)
	}
	return result
}

func validateChannelTargets(channels []string, email, phone, pushToken *string) error {
	for _, channel := range channels {
		switch channel {
		case "email":
			if email == nil {
				return ErrInvalidSubscriber
			}
		case "sms":
			if phone == nil {
				return ErrInvalidSubscriber
			}
		case "push":
			if pushToken == nil {
				return ErrInvalidSubscriber
			}
		}
	}
	return nil
}

func buildStatusJSON(channels []string, status ChannelStatus) ([]byte, error) {
	normalized := ChannelStatus{}
	for _, channel := range channels {
		value := statusForChannel(channel, status)
		if !isValidStatus(value) {
			return nil, ErrInvalidSubscriber
		}
		switch channel {
		case "email":
			normalized.Email = &value
		case "sms":
			normalized.SMS = &value
		case "push":
			normalized.Push = &value
		}
	}
	return json.Marshal(normalized)
}

func statusForChannel(channel string, status ChannelStatus) ChannelStatusValue {
	switch channel {
	case "email":
		if status.Email != nil {
			return *status.Email
		}
	case "sms":
		if status.SMS != nil {
			return *status.SMS
		}
	case "push":
		if status.Push != nil {
			return *status.Push
		}
	}
	return StatusSubscribed
}

func isValidStatus(status ChannelStatusValue) bool {
	switch status {
	case StatusSubscribed, StatusUnsubscribed, StatusBounced:
		return true
	default:
		return false
	}
}

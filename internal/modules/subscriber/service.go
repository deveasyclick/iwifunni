package subscriber

import (
	"context"
	"encoding/json"
	"errors"
	"strings"

	"github.com/deveasyclick/iwifunni/internal/db/gen"
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
	Name          string
	Email         *string
	Phone         *string
	PushToken     *string
	Channels      []string
	Tags          []string
	Metadata      map[string]interface{}
	Preferences   map[string]interface{}
}

type UpdateInput struct {
	ID            uuid.UUID
	EnvironmentID uuid.UUID
	Name          string
	Email         *string
	Phone         *string
	PushToken     *string
	Channels      []string
	Tags          []string
	Metadata      map[string]interface{}
	Preferences   map[string]interface{}
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

func (s *Service) Search(ctx context.Context, environmentID uuid.UUID, query string) ([]db.Subscriber, error) {
	if query == "" {
		return s.repo.List(ctx, environmentID)
	}
	return s.repo.Search(ctx, environmentID, query)
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
	email := trimOptional(in.Email)
	phone := trimOptional(in.Phone)
	pushToken := trimOptional(in.PushToken)
	if phone != nil && !phoneHasCountryCode(*phone) {
		return db.CreateSubscriberParams{}, ErrInvalidSubscriber
	}
	channels := deriveChannels(email, phone, pushToken)
	statusJSON := buildDefaultStatusJSON(channels)
	metadataJSON, err := buildMetadataJSON(in.Metadata)
	if err != nil {
		return db.CreateSubscriberParams{}, err
	}
	preferencesJSON, err := buildMetadataJSON(in.Preferences)
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
		Metadata:      metadataJSON,
		Preferences:   preferencesJSON,
	}, validateName(name)
}

func buildUpdateParams(in UpdateInput) (db.UpdateSubscriberParams, error) {
	name := strings.TrimSpace(in.Name)
	email := trimOptional(in.Email)
	phone := trimOptional(in.Phone)
	pushToken := trimOptional(in.PushToken)
	if phone != nil && !phoneHasCountryCode(*phone) {
		return db.UpdateSubscriberParams{}, ErrInvalidSubscriber
	}
	channels := deriveChannels(email, phone, pushToken)
	statusJSON := buildDefaultStatusJSON(channels)
	metadataJSON, err := buildMetadataJSON(in.Metadata)
	if err != nil {
		return db.UpdateSubscriberParams{}, err
	}
	preferencesJSON, err := buildMetadataJSON(in.Preferences)
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
		Metadata:      metadataJSON,
		Preferences:   preferencesJSON,
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

func phoneHasCountryCode(phone string) bool {
	return len(phone) > 0 && phone[0] == '+'
}

func deriveChannels(email, phone, pushToken *string) []string {
	channels := make([]string, 0, 3)
	if email != nil {
		channels = append(channels, "email")
	}
	if phone != nil {
		channels = append(channels, "sms")
	}
	if pushToken != nil {
		channels = append(channels, "push")
	}
	return channels
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



func buildDefaultStatusJSON(channels []string) []byte {
	normalized := ChannelStatus{}
	for _, channel := range channels {
		value := StatusSubscribed
		switch channel {
		case "email":
			normalized.Email = &value
		case "sms":
			normalized.SMS = &value
		case "push":
			normalized.Push = &value
		}
	}
	data, _ := json.Marshal(normalized)
	return data
}

func buildMetadataJSON(metadata map[string]interface{}) ([]byte, error) {
	if metadata == nil {
		return []byte(`{}`), nil
	}
	data, err := json.Marshal(metadata)
	if err != nil {
		return nil, ErrInvalidSubscriber
	}
	return data, nil
}

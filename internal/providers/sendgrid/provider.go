package sendgrid

import (
	"context"
	"encoding/json"
	"fmt"
	"net/mail"
	"strings"

	"github.com/sendgrid/sendgrid-go"
	sgmail "github.com/sendgrid/sendgrid-go/helpers/mail"

	"github.com/deveasyclick/iwifunni/internal/providers/catalog"
	"github.com/deveasyclick/iwifunni/internal/types"
)

const (
	Name    = "sendgrid"
	Channel = "email"
)

type Definition struct{}

func NewDefinition() Definition { return Definition{} }

func (Definition) Name() string    { return Name }
func (Definition) Channel() string { return Channel }

type managementConfig struct {
	FromEmail string `json:"from_email"`
}

func (Definition) Normalize(credentials, config map[string]any, current *catalog.StoredInput) (catalog.NormalizedInput, error) {
	credentialsJSON, err := normalizeCredentials(credentials, current)
	if err != nil {
		return catalog.NormalizedInput{}, err
	}
	configJSON, err := normalizeConfig(config, current)
	if err != nil {
		return catalog.NormalizedInput{}, err
	}

	return catalog.NormalizedInput{
		Name:            Name,
		Channel:         Channel,
		CredentialsJSON: credentialsJSON,
		ConfigJSON:      configJSON,
	}, nil
}

func normalizeCredentials(credentials map[string]any, current *catalog.StoredInput) ([]byte, error) {
	if len(credentials) == 0 {
		if current != nil && len(current.Credentials) > 0 {
			return nil, nil
		}
		return nil, catalog.NewValidationError("a valid sendgrid api_key is required")
	}

	apiKey, ok := credentials["api_key"].(string)
	if !ok || strings.TrimSpace(apiKey) == "" {
		return nil, catalog.NewValidationError("a valid sendgrid api_key is required")
	}

	credentialsJSON, err := json.Marshal(map[string]string{
		"api_key": strings.TrimSpace(apiKey),
	})
	if err != nil {
		return nil, err
	}

	return credentialsJSON, nil
}

func normalizeConfig(config map[string]any, current *catalog.StoredInput) ([]byte, error) {
	if len(config) == 0 {
		if current == nil {
			return nil, catalog.NewValidationError("a valid sendgrid from_email is required")
		}
		if err := validateStoredConfig(current.Config); err != nil {
			return nil, err
		}
		return current.Config, nil
	}

	fromEmail, ok := config["from_email"].(string)
	if !ok {
		return nil, catalog.NewValidationError("a valid sendgrid from_email is required")
	}
	fromEmail = strings.TrimSpace(fromEmail)
	if fromEmail == "" {
		return nil, catalog.NewValidationError("a valid sendgrid from_email is required")
	}
	if _, err := mail.ParseAddress(fromEmail); err != nil {
		return nil, catalog.NewValidationError("a valid sendgrid from_email is required")
	}

	configJSON, err := json.Marshal(managementConfig{FromEmail: fromEmail})
	if err != nil {
		return nil, err
	}

	return configJSON, nil
}

func validateStoredConfig(raw []byte) error {
	if len(raw) == 0 {
		return catalog.NewValidationError("a valid sendgrid from_email is required")
	}

	var cfg managementConfig
	if err := json.Unmarshal(raw, &cfg); err != nil {
		return catalog.NewValidationError("a valid sendgrid from_email is required")
	}
	cfg.FromEmail = strings.TrimSpace(cfg.FromEmail)
	if cfg.FromEmail == "" {
		return catalog.NewValidationError("a valid sendgrid from_email is required")
	}
	if _, err := mail.ParseAddress(cfg.FromEmail); err != nil {
		return catalog.NewValidationError("a valid sendgrid from_email is required")
	}

	return nil
}

type RuntimeProvider struct{}

func NewRuntimeProvider() RuntimeProvider { return RuntimeProvider{} }

func (RuntimeProvider) Name() string    { return Name }
func (RuntimeProvider) Channel() string { return Channel }

type sendGridConfig struct {
	APIKey    string `json:"api_key"`
	FromEmail string `json:"from_email"`
}

func (RuntimeProvider) Send(ctx context.Context, job *types.NotificationJob, configJSON []byte) ([]catalog.DeliveryAttempt, error) {
	content := job.ContentForChannel(Channel)

	var cfg sendGridConfig
	if err := json.Unmarshal(configJSON, &cfg); err != nil {
		return []catalog.DeliveryAttempt{{Destination: job.Recipient.Email, Err: fmt.Errorf("invalid sendgrid config: %w", err)}}, err
	}

	if cfg.APIKey == "" {
		return []catalog.DeliveryAttempt{{Destination: job.Recipient.Email, Err: fmt.Errorf("sendgrid api_key is required")}}, fmt.Errorf("sendgrid api_key is required")
	}
	if cfg.FromEmail == "" {
		return []catalog.DeliveryAttempt{{Destination: job.Recipient.Email, Err: fmt.Errorf("sendgrid from_email is required")}}, fmt.Errorf("sendgrid from_email is required")
	}

	from := sgmail.NewEmail("", cfg.FromEmail)
	to := sgmail.NewEmail("", job.Recipient.Email)
	message := sgmail.NewSingleEmail(from, content.Title, to, "", content.Message)
	client := sendgrid.NewSendClient(cfg.APIKey)

	resp, err := client.SendWithContext(ctx, message)
	if err != nil {
		return []catalog.DeliveryAttempt{{Destination: job.Recipient.Email, Err: err}}, err
	}
	if resp.StatusCode >= 400 {
		return []catalog.DeliveryAttempt{{Destination: job.Recipient.Email, Err: fmt.Errorf("sendgrid returned status %d: %s", resp.StatusCode, resp.Body)}}, fmt.Errorf("sendgrid returned status %d: %s", resp.StatusCode, resp.Body)
	}

	return []catalog.DeliveryAttempt{{Destination: job.Recipient.Email}}, nil
}

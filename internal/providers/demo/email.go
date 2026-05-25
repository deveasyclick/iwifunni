// Package demo provides sandbox providers that redirect all notifications to the
// environment owner's contact details. No external credentials are required.
// Deliveries are logged to stdout and recorded as successful so teams can test
// the full notification pipeline without risking messages to real recipients.
package demo

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/deveasyclick/iwifunni/internal/providers/catalog"
	"github.com/deveasyclick/iwifunni/internal/types"
	"github.com/deveasyclick/iwifunni/pkg/logger"
)

const (
	EmailName    = "demo-email"
	EmailChannel = "email"
)

type emailConfig struct {
	OwnerEmail string `json:"owner_email"`
	SenderName string `json:"sender_name,omitempty"`
}

// EmailRuntimeProvider intercepts email sends and redirects them to the
// owner's email address stored in the provider config.
type EmailRuntimeProvider struct{}

func NewEmailRuntimeProvider() EmailRuntimeProvider { return EmailRuntimeProvider{} }

func (EmailRuntimeProvider) Name() string    { return EmailName }
func (EmailRuntimeProvider) Channel() string { return EmailChannel }

func (EmailRuntimeProvider) Send(_ context.Context, job *types.NotificationJob, configJSON []byte) ([]catalog.DeliveryAttempt, error) {
	var cfg emailConfig
	if err := json.Unmarshal(configJSON, &cfg); err != nil {
		err = fmt.Errorf("demo-email: invalid config: %w", err)
		return []catalog.DeliveryAttempt{{Destination: job.Recipient.Email, Err: err}}, err
	}

	if cfg.OwnerEmail == "" {
		err := fmt.Errorf("demo-email: owner_email is not configured")
		return []catalog.DeliveryAttempt{{Destination: job.Recipient.Email, Err: err}}, err
	}

	content := job.ContentForChannel(EmailChannel)
	originalRecipient := job.Recipient.Email

	logger.Get().Info().
		Str("provider", EmailName).
		Str("original_recipient", originalRecipient).
		Str("redirected_to", cfg.OwnerEmail).
		Str("title", content.Title).
		Msg("[DEMO] email notification captured — redirected to owner address")

	return []catalog.DeliveryAttempt{{Destination: cfg.OwnerEmail}}, nil
}

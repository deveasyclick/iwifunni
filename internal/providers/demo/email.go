// Package demo provides sandbox providers that redirect all notifications to the
// environment owner's contact details. No external credentials are required.
// Deliveries are logged to stdout and recorded as successful so teams can test
// the full notification pipeline without risking messages to real recipients.
package demo

import (
	"context"
	"encoding/json"
	"fmt"

	brevo "github.com/getbrevo/brevo-go/lib"

	"github.com/deveasyclick/iwifunni/internal/providers/catalog"
	"github.com/deveasyclick/iwifunni/internal/types"
	"github.com/deveasyclick/iwifunni/pkg/logger"
)

const (
	EmailName    = "demo-email"
	EmailChannel = "email"
)

type emailConfig struct {
	OwnerEmail    string `json:"owner_email"`
	SenderName    string `json:"sender_name,omitempty"`
	BrevoAPIKey   string `json:"brevo_api_key,omitempty"`
	BrevoFromEmail string `json:"brevo_from_email,omitempty"`
}

// EmailRuntimeProvider sends test emails via Brevo but only to the
// authenticated subscriber's own email address. This is for testing
// the full notification pipeline without risking messages to arbitrary recipients.
type EmailRuntimeProvider struct{}

func NewEmailRuntimeProvider() EmailRuntimeProvider { return EmailRuntimeProvider{} }

func (EmailRuntimeProvider) Name() string    { return EmailName }
func (EmailRuntimeProvider) Channel() string { return EmailChannel }

func (EmailRuntimeProvider) Send(ctx context.Context, job *types.NotificationJob, configJSON []byte) ([]catalog.DeliveryAttempt, error) {
	var cfg emailConfig
	if err := json.Unmarshal(configJSON, &cfg); err != nil {
		err = fmt.Errorf("demo-email: invalid config: %w", err)
		return []catalog.DeliveryAttempt{{Destination: job.Recipient.Email, Err: err}}, err
	}

	if cfg.OwnerEmail == "" {
		err := fmt.Errorf("demo-email: owner_email is not configured")
		return []catalog.DeliveryAttempt{{Destination: job.Recipient.Email, Err: err}}, err
	}

	// Safety check: demo email can only send to the owner's own email address
	if job.Recipient.Email == "" {
		err := fmt.Errorf("demo-email: no recipient email in notification")
		return []catalog.DeliveryAttempt{{Destination: "", Err: err}}, err
	}
	if job.Recipient.Email != cfg.OwnerEmail {
		err := fmt.Errorf("demo-email: can only send to %s (your own email), not to %s", cfg.OwnerEmail, job.Recipient.Email)
		return []catalog.DeliveryAttempt{{Destination: job.Recipient.Email, Err: err}}, err
	}

	content := job.ContentForChannel(EmailChannel)

	// Send via Brevo if credentials are available
	if cfg.BrevoAPIKey != "" && cfg.BrevoFromEmail != "" {
		apiCfg := brevo.NewConfiguration()
		apiCfg.AddDefaultHeader("api-key", cfg.BrevoAPIKey)
		client := brevo.NewAPIClient(apiCfg)

		email := brevo.SendSmtpEmail{
			Sender: &brevo.SendSmtpEmailSender{
				Email: cfg.BrevoFromEmail,
			},
			To: []brevo.SendSmtpEmailTo{
				{Email: job.Recipient.Email},
			},
			Subject:     content.Title,
			HtmlContent: content.Message,
		}

		_, _, err := client.TransactionalEmailsApi.SendTransacEmail(ctx, email)
		if err != nil {
			err = fmt.Errorf("demo-email: failed to send via Brevo: %w", err)
			return []catalog.DeliveryAttempt{{Destination: job.Recipient.Email, Err: err}}, err
		}

		logger.Get().Info("[DEMO] email sent via Brevo",
			"provider", EmailName,
			"recipient", job.Recipient.Email,
			"title", content.Title,
		)

		return []catalog.DeliveryAttempt{{Destination: job.Recipient.Email}}, nil
	}

	// Fallback: log only if no Brevo credentials configured
	hasKey := cfg.BrevoAPIKey != ""
	hasFrom := cfg.BrevoFromEmail != ""
	logger.Get().Info("[DEMO] email notification captured (no Brevo credentials — not sent)",
		"provider", EmailName,
		"recipient", job.Recipient.Email,
		"title", content.Title,
		"has_brevo_api_key", hasKey,
		"has_brevo_from_email", hasFrom,
	)

	return []catalog.DeliveryAttempt{{Destination: job.Recipient.Email}}, nil
}

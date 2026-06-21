package brevo

import (
	"context"
	"encoding/json"
	"fmt"

	brevo "github.com/getbrevo/brevo-go/lib"

	"github.com/deveasyclick/iwifunni/internal/providers/catalog"
	"github.com/deveasyclick/iwifunni/internal/types"
)

type RuntimeProvider struct{}

func NewRuntimeProvider() RuntimeProvider { return RuntimeProvider{} }

func (RuntimeProvider) Name() string    { return "brevo" }
func (RuntimeProvider) Channel() string { return "email" }

type brevoConfig struct {
	APIKey    string `json:"api_key"`
	FromEmail string `json:"from_email"`
}

func (RuntimeProvider) Send(ctx context.Context, job *types.NotificationJob, configJSON []byte) ([]catalog.DeliveryAttempt, error) {
	content := job.ContentForChannel("email")

	var cfg brevoConfig
	if err := json.Unmarshal(configJSON, &cfg); err != nil {
		return []catalog.DeliveryAttempt{{Destination: job.Recipient.Email, Err: fmt.Errorf("invalid brevo config: %w", err)}}, err
	}

	if cfg.APIKey == "" {
		return []catalog.DeliveryAttempt{{Destination: job.Recipient.Email, Err: fmt.Errorf("brevo api_key is required")}}, fmt.Errorf("brevo api_key is required")
	}
	if cfg.FromEmail == "" {
		return []catalog.DeliveryAttempt{{Destination: job.Recipient.Email, Err: fmt.Errorf("brevo from_email is required")}}, fmt.Errorf("brevo from_email is required")
	}

	apiCfg := brevo.NewConfiguration()
	apiCfg.AddDefaultHeader("api-key", cfg.APIKey)
	client := brevo.NewAPIClient(apiCfg)

	email := brevo.SendSmtpEmail{
		Sender: &brevo.SendSmtpEmailSender{
			Email: cfg.FromEmail,
		},
		To: []brevo.SendSmtpEmailTo{
			{Email: job.Recipient.Email},
		},
		Subject:     content.Title,
		HtmlContent: content.Message,
	}

	_, _, err := client.TransactionalEmailsApi.SendTransacEmail(ctx, email)
	if err != nil {
		return []catalog.DeliveryAttempt{{Destination: job.Recipient.Email, Err: err}}, err
	}

	return []catalog.DeliveryAttempt{{Destination: job.Recipient.Email}}, nil
}

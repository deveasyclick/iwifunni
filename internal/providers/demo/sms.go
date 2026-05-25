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
	SMSName    = "demo-sms"
	SMSChannel = "sms"
)

type smsConfig struct {
	OwnerPhone string `json:"owner_phone"`
}

// SMSRuntimeProvider intercepts SMS sends and redirects them to the
// owner's phone number stored in the provider config.
type SMSRuntimeProvider struct{}

func NewSMSRuntimeProvider() SMSRuntimeProvider { return SMSRuntimeProvider{} }

func (SMSRuntimeProvider) Name() string    { return SMSName }
func (SMSRuntimeProvider) Channel() string { return SMSChannel }

func (SMSRuntimeProvider) Send(_ context.Context, job *types.NotificationJob, configJSON []byte) ([]catalog.DeliveryAttempt, error) {
	var cfg smsConfig
	if err := json.Unmarshal(configJSON, &cfg); err != nil {
		err = fmt.Errorf("demo-sms: invalid config: %w", err)
		return []catalog.DeliveryAttempt{{Destination: job.Recipient.PhoneNumber, Err: err}}, err
	}

	if cfg.OwnerPhone == "" {
		err := fmt.Errorf("demo-sms: owner_phone is not configured")
		return []catalog.DeliveryAttempt{{Destination: job.Recipient.PhoneNumber, Err: err}}, err
	}

	content := job.ContentForChannel(SMSChannel)
	originalRecipient := job.Recipient.PhoneNumber

	logger.Get().Info().
		Str("provider", SMSName).
		Str("original_recipient", originalRecipient).
		Str("redirected_to", cfg.OwnerPhone).
		Str("title", content.Title).
		Msg("[DEMO] SMS notification captured — redirected to owner number")

	return []catalog.DeliveryAttempt{{Destination: cfg.OwnerPhone}}, nil
}

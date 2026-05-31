package termii

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/deveasyclick/iwifunni/internal/channels"
	"github.com/deveasyclick/iwifunni/internal/providers/catalog"
	"github.com/deveasyclick/iwifunni/internal/types"
)

type RuntimeProvider struct{}

func NewRuntimeProvider() RuntimeProvider { return RuntimeProvider{} }

func (RuntimeProvider) Name() string    { return "termii" }
func (RuntimeProvider) Channel() string { return "sms" }

func (RuntimeProvider) Send(ctx context.Context, job *types.NotificationJob, configJSON []byte) ([]catalog.DeliveryAttempt, error) {
	content := job.ContentForChannel("sms")

	var cfg channels.SMSConfig
	if err := json.Unmarshal(configJSON, &cfg); err != nil {
		return []catalog.DeliveryAttempt{{Destination: job.Recipient.PhoneNumber, Err: fmt.Errorf("invalid sms config: %w", err)}}, err
	}

	err := channels.SendSMS(ctx, cfg, job.Recipient.PhoneNumber, content.Title, content.Message, job.Metadata)
	if err != nil {
		return []catalog.DeliveryAttempt{{Destination: job.Recipient.PhoneNumber, Err: err}}, err
	}

	return []catalog.DeliveryAttempt{{Destination: job.Recipient.PhoneNumber}}, nil
}

package demo

import (
	"context"

	"github.com/deveasyclick/iwifunni/internal/providers/catalog"
	"github.com/deveasyclick/iwifunni/internal/types"
	"github.com/deveasyclick/iwifunni/pkg/logger"
)

const (
	SMSName    = "demo-sms"
	SMSChannel = "sms"
)

// SMSRuntimeProvider is a no-op SMS provider for demo/testing. It logs the
// SMS that would be sent to the subscriber's own phone number and returns
// success without making any real network calls.
type SMSRuntimeProvider struct{}

func NewSMSRuntimeProvider() SMSRuntimeProvider { return SMSRuntimeProvider{} }

func (SMSRuntimeProvider) Name() string    { return SMSName }
func (SMSRuntimeProvider) Channel() string { return SMSChannel }

func (SMSRuntimeProvider) Send(_ context.Context, job *types.NotificationJob, _ []byte) ([]catalog.DeliveryAttempt, error) {
	content := job.ContentForChannel(SMSChannel)

	logger.Get().Info("[DEMO] SMS notification captured — no real message sent",
		"provider", SMSName,
		"recipient", job.Recipient.PhoneNumber,
		"title", content.Title,
	)

	return []catalog.DeliveryAttempt{{Destination: job.Recipient.PhoneNumber}}, nil
}

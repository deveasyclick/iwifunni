package smtp

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

func (RuntimeProvider) Name() string    { return "smtp" }
func (RuntimeProvider) Channel() string { return "email" }

func (RuntimeProvider) Send(ctx context.Context, job *types.NotificationJob, configJSON []byte) ([]catalog.DeliveryAttempt, error) {
	content := job.ContentForChannel("email")

	var cfg channels.EmailConfig
	if err := json.Unmarshal(configJSON, &cfg); err != nil {
		return []catalog.DeliveryAttempt{{Destination: job.Recipient.Email, Err: fmt.Errorf("invalid email config: %w", err)}}, err
	}

	err := channels.SendEmail(ctx, cfg, job.Recipient.Email, content.Title, content.Message, job.Metadata)
	if err != nil {
		return []catalog.DeliveryAttempt{{Destination: job.Recipient.Email, Err: err}}, err
	}

	return []catalog.DeliveryAttempt{{Destination: job.Recipient.Email}}, nil
}

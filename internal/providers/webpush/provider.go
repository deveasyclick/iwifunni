package webpush

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

func (RuntimeProvider) Name() string    { return "webpush" }
func (RuntimeProvider) Channel() string { return "push" }

func (RuntimeProvider) Send(ctx context.Context, job *types.NotificationJob, configJSON []byte) ([]catalog.DeliveryAttempt, error) {
	content := job.ContentForChannel("push")

	var cfg channels.PushConfig
	if err := json.Unmarshal(configJSON, &cfg); err != nil {
		return []catalog.DeliveryAttempt{{Err: fmt.Errorf("invalid push config: %w", err)}}, err
	}
	if len(job.Recipient.PushTokens) == 0 {
		err := fmt.Errorf("push recipient is required")
		return []catalog.DeliveryAttempt{{Err: err}}, err
	}

	attempts := make([]catalog.DeliveryAttempt, 0, len(job.Recipient.PushTokens))
	var hasFailure bool
	for _, destination := range job.Recipient.PushTokens {
		attempt := catalog.DeliveryAttempt{Destination: destination}
		attempt.Err = channels.SendBrowserPush(ctx, cfg.PublicKey, cfg.PrivateKey, destination, content.Title, content.Message, job.Metadata)
		if attempt.Err != nil {
			hasFailure = true
		}
		attempts = append(attempts, attempt)
	}
	if hasFailure {
		return attempts, fmt.Errorf("one or more push attempts failed")
	}

	return attempts, nil
}

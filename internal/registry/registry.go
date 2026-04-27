package registry

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/deveasyclick/iwifunni/internal/channels"
	"github.com/deveasyclick/iwifunni/internal/types"
)

type DeliveryAttempt struct {
	Destination string
	Err         error
}

type Provider interface {
	Name() string
	Channel() string
	Send(context.Context, *types.NotificationJob, []byte) ([]DeliveryAttempt, error)
}

type Registry struct {
	providers map[string]Provider
}

func New(providers ...Provider) *Registry {
	r := &Registry{providers: make(map[string]Provider, len(providers))}
	for _, p := range providers {
		r.Register(p)
	}
	return r
}

func NewDefault() *Registry {
	return New(
		emailProvider{name: "smtp"},
		emailProvider{name: "sendgrid"},
		emailProvider{name: "brevo"},
		smsProvider{name: "termii"},
		smsProvider{name: "twilio"},
		pushProvider{name: "fcm"},
		pushProvider{name: "webpush"},
	)
}

func (r *Registry) Register(p Provider) {
	if p == nil {
		return
	}
	r.providers[p.Name()] = p
}

func (r *Registry) Get(name string) (Provider, bool) {
	p, ok := r.providers[name]
	return p, ok
}

// --- built-in providers ---

type emailProvider struct{ name string }

func (p emailProvider) Name() string    { return p.name }
func (p emailProvider) Channel() string { return "email" }
func (p emailProvider) Send(ctx context.Context, job *types.NotificationJob, configJSON []byte) ([]DeliveryAttempt, error) {
	var cfg channels.EmailConfig
	if err := json.Unmarshal(configJSON, &cfg); err != nil {
		return []DeliveryAttempt{{Destination: job.Recipient.Email, Err: fmt.Errorf("invalid email config: %w", err)}}, err
	}
	err := channels.SendEmail(ctx, cfg, job.Recipient.Email, job.Title, job.Message, job.Metadata)
	if err != nil {
		return []DeliveryAttempt{{Destination: job.Recipient.Email, Err: err}}, err
	}
	return []DeliveryAttempt{{Destination: job.Recipient.Email}}, nil
}

type smsProvider struct{ name string }

func (p smsProvider) Name() string    { return p.name }
func (p smsProvider) Channel() string { return "sms" }
func (p smsProvider) Send(ctx context.Context, job *types.NotificationJob, configJSON []byte) ([]DeliveryAttempt, error) {
	var cfg channels.SMSConfig
	if err := json.Unmarshal(configJSON, &cfg); err != nil {
		return []DeliveryAttempt{{Destination: job.Recipient.PhoneNumber, Err: fmt.Errorf("invalid sms config: %w", err)}}, err
	}
	err := channels.SendSMS(ctx, cfg, job.Recipient.PhoneNumber, job.Title, job.Message, job.Metadata)
	if err != nil {
		return []DeliveryAttempt{{Destination: job.Recipient.PhoneNumber, Err: err}}, err
	}
	return []DeliveryAttempt{{Destination: job.Recipient.PhoneNumber}}, nil
}

type pushProvider struct{ name string }

func (p pushProvider) Name() string    { return p.name }
func (p pushProvider) Channel() string { return "push" }
func (p pushProvider) Send(ctx context.Context, job *types.NotificationJob, configJSON []byte) ([]DeliveryAttempt, error) {
	var cfg channels.PushConfig
	if err := json.Unmarshal(configJSON, &cfg); err != nil {
		return []DeliveryAttempt{{Err: fmt.Errorf("invalid push config: %w", err)}}, err
	}
	if len(job.Recipient.PushTokens) == 0 {
		err := fmt.Errorf("push recipient is required")
		return []DeliveryAttempt{{Err: err}}, err
	}
	attempts := make([]DeliveryAttempt, 0, len(job.Recipient.PushTokens))
	var hasFailure bool
	for _, dest := range job.Recipient.PushTokens {
		a := DeliveryAttempt{Destination: dest}
		switch p.name {
		case "fcm":
			a.Err = channels.SendFCM(ctx, cfg.ServerKey, dest, job.Title, job.Message, job.Metadata)
		case "webpush":
			a.Err = channels.SendBrowserPush(ctx, cfg.PublicKey, cfg.PrivateKey, dest, job.Title, job.Message, job.Metadata)
		default:
			a.Err = fmt.Errorf("unsupported push provider %s", p.name)
		}
		if a.Err != nil {
			hasFailure = true
		}
		attempts = append(attempts, a)
	}
	if hasFailure {
		return attempts, fmt.Errorf("one or more push attempts failed")
	}
	return attempts, nil
}

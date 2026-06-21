package registry

import (
	"github.com/deveasyclick/iwifunni/internal/providers/brevo"
	"github.com/deveasyclick/iwifunni/internal/providers/catalog"
	"github.com/deveasyclick/iwifunni/internal/providers/demo"
	"github.com/deveasyclick/iwifunni/internal/providers/fcm"
	"github.com/deveasyclick/iwifunni/internal/providers/sendgrid"
	"github.com/deveasyclick/iwifunni/internal/providers/smtp"
	"github.com/deveasyclick/iwifunni/internal/providers/termii"
	"github.com/deveasyclick/iwifunni/internal/providers/twilio"
	"github.com/deveasyclick/iwifunni/internal/providers/webpush"
)

// DeliveryAttempt records the result of sending to a single destination.
type DeliveryAttempt = catalog.DeliveryAttempt

// Provider sends a notification job to its channel.
type Provider = catalog.RuntimeProvider

// Registry holds all available runtime providers indexed by name.
type Registry struct {
	providers map[string]Provider
}

// New creates a Registry with the given providers.
func New(providers ...Provider) *Registry {
	r := &Registry{providers: make(map[string]Provider, len(providers))}
	for _, p := range providers {
		r.Register(p)
	}
	return r
}

// NewDefault returns a Registry pre-populated with all built-in providers.
func NewDefault() *Registry {
	return New(
		smtp.NewRuntimeProvider(),
		sendgrid.NewRuntimeProvider(),
		brevo.NewRuntimeProvider(),
		brevo.NewSMSRuntimeProvider(),
		termii.NewRuntimeProvider(),
		twilio.NewRuntimeProvider(),
		fcm.NewRuntimeProvider(),
		webpush.NewRuntimeProvider(),
		demo.NewEmailRuntimeProvider(),
		demo.NewSMSRuntimeProvider(),
	)
}

// Register adds a provider to the registry.
func (r *Registry) Register(p Provider) {
	if p == nil {
		return
	}
	r.providers[p.Name()] = p
}

// Get looks up a provider by name.
func (r *Registry) Get(name string) (Provider, bool) {
	if r.providers == nil {
		return nil, false
	}
	p, ok := r.providers[name]
	return p, ok
}

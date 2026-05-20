package catalog

import (
	"context"

	"github.com/deveasyclick/iwifunni/internal/types"
)

type DeliveryAttempt struct {
	Destination string
	Err         error
}

type RuntimeProvider interface {
	Name() string
	Channel() string
	Send(context.Context, *types.NotificationJob, []byte) ([]DeliveryAttempt, error)
}

type StoredInput struct {
	Credentials []byte
	Config      []byte
}

type NormalizedInput struct {
	Name            string
	Channel         string
	CredentialsJSON []byte
	ConfigJSON      []byte
}

type ValidationError struct {
	Message string
}

func (e *ValidationError) Error() string {
	return e.Message
}

func NewValidationError(message string) error {
	return &ValidationError{Message: message}
}

type Definition interface {
	Name() string
	Channel() string
	Normalize(credentials, config map[string]any, current *StoredInput) (NormalizedInput, error)
}

type Catalog struct {
	definitions map[string]Definition
}

func New(definitions ...Definition) *Catalog {
	c := &Catalog{definitions: make(map[string]Definition, len(definitions))}
	for _, definition := range definitions {
		c.Register(definition)
	}
	return c
}

func (c *Catalog) Register(definition Definition) {
	if definition == nil {
		return
	}
	c.definitions[definition.Name()] = definition
}

func (c *Catalog) Get(name string) (Definition, bool) {
	definition, ok := c.definitions[name]
	return definition, ok
}

type Registry struct {
	providers map[string]RuntimeProvider
}

func NewRegistry(providers ...RuntimeProvider) *Registry {
	r := &Registry{providers: make(map[string]RuntimeProvider, len(providers))}
	for _, provider := range providers {
		r.Register(provider)
	}
	return r
}

func (r *Registry) Register(provider RuntimeProvider) {
	if provider == nil {
		return
	}
	r.providers[provider.Name()] = provider
}

func (r *Registry) Get(name string) (RuntimeProvider, bool) {
	provider, ok := r.providers[name]
	return provider, ok
}

package registry

import (
	"github.com/deveasyclick/iwifunni/internal/providers/catalog"
	"github.com/deveasyclick/iwifunni/internal/providers/defaults"
)

type DeliveryAttempt = catalog.DeliveryAttempt
type Provider = catalog.RuntimeProvider

type Registry struct {
	inner *catalog.Registry
}

func New(providers ...Provider) *Registry {
	return &Registry{inner: catalog.NewRegistry(providers...)}
}

func NewDefault() *Registry {
	return &Registry{inner: defaults.NewRegistry()}
}

func (r *Registry) Register(p Provider) {
	if r.inner == nil {
		r.inner = catalog.NewRegistry()
	}
	r.inner.Register(p)
}

func (r *Registry) Get(name string) (Provider, bool) {
	if r.inner == nil {
		return nil, false
	}
	return r.inner.Get(name)
}

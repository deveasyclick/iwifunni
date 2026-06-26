package auth

import (
	"time"

	"github.com/deveasyclick/iwifunni/internal/shared/mailer"
)

type Service struct {
	users              authUserStore
	verifications      authVerificationStore
	tenants            authProjectStore
	identities         authIdentityStore
	sessions           authSessionStore
	now                func() time.Time
	refreshTTL         time.Duration
	verificationTTL    time.Duration
	mailer             *mailer.Mailer
}

func NewService(store authStore, refreshTTL, verificationTTL time.Duration, m *mailer.Mailer) *Service {
	if verificationTTL <= 0 {
		verificationTTL = defaultVerificationTTL
	}

	return &Service{
		users:              store,
		verifications:      store,
		tenants:            store,
		identities:         store,
		sessions:           store,
		now:                time.Now,
		refreshTTL:         refreshTTL,
		verificationTTL:    verificationTTL,
		mailer:             m,
	}
}

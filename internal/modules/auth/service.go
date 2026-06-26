package auth

import (
	"context"
	"time"

	"github.com/deveasyclick/iwifunni/pkg/logger"
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
	verificationSender func(ctx context.Context, email, code string) error
}

func defaultVerificationSender(_ context.Context, email, code string) error {
	logger.Get().Info("signup verification code generated", "email", email, "verification_code", code)
	return nil
}

func NewService(store authStore, refreshTTL, verificationTTL time.Duration) *Service {
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
		verificationSender: defaultVerificationSender,
	}
}

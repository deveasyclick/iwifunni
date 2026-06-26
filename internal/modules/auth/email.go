package auth

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/deveasyclick/iwifunni/internal/db"
	"github.com/deveasyclick/iwifunni/pkg/logger"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

// createAndSendVerification generates a verification code, stores it, logs it,
// and sends it via email asynchronously. Returns the expiry time.
func (s *Service) createAndSendVerification(ctx context.Context, userID uuid.UUID, email string) (time.Time, error) {
	code, codeHash, err := GenerateVerificationCode()
	if err != nil {
		return time.Time{}, err
	}

	now := s.now().UTC()
	nowTs := pgtype.Timestamptz{Time: now, Valid: true}
	expiresAt := pgtype.Timestamptz{Time: now.Add(s.verificationTTL), Valid: true}

	if err := s.verifications.UpsertEmailVerification(ctx, db.UpsertEmailVerificationParams{
		UserID:     userID,
		CodeHash:   codeHash,
		ExpiresAt:  expiresAt,
		ConsumedAt: pgtype.Timestamptz{},
		CreatedAt:  nowTs,
		UpdatedAt:  nowTs,
	}); err != nil {
		return time.Time{}, err
	}

	logger.Get().Info("signup verification code generated", "email", email, "verification_code", code)

	go func() {
		if err := s.sendVerificationEmail(context.Background(), email, code); err != nil {
			logger.Get().Error("failed to send verification email", "error", err, "email", email)
		}
	}()

	return expiresAt.Time, nil
}

// ResendVerification generates a new code and re-sends it for an unverified user.
func (s *Service) ResendVerification(ctx context.Context, email string) (*ResendVerificationResult, error) {
	email = strings.ToLower(strings.TrimSpace(email))

	user, err := s.users.GetUserByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			// Don't reveal whether the email exists — just return success.
			return &ResendVerificationResult{}, nil
		}
		return nil, err
	}

	if user.EmailVerifiedAt.Valid {
		return nil, fmt.Errorf("email already verified")
	}

	expiresAt, err := s.createAndSendVerification(ctx, user.ID, email)
	if err != nil {
		return nil, err
	}

	return &ResendVerificationResult{ExpiresAt: expiresAt}, nil
}

func (s *Service) VerifyEmail(ctx context.Context, input VerifyEmailInput) (*VerifyEmailResult, error) {
	email := strings.ToLower(strings.TrimSpace(input.Email))
	code := strings.TrimSpace(input.Code)

	user, err := s.users.GetUserByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrInvalidVerificationCode
		}
		return nil, err
	}

	verification, err := s.verifications.GetEmailVerificationByUserID(ctx, user.ID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrInvalidVerificationCode
		}
		return nil, err
	}
	if verification.ConsumedAt.Valid {
		return nil, ErrInvalidVerificationCode
	}
	if !verification.ExpiresAt.Valid || verification.ExpiresAt.Time.Before(s.now().UTC()) {
		return nil, ErrVerificationCodeExpired
	}
	if !CompareVerificationCode(code, verification.CodeHash) {
		return nil, ErrInvalidVerificationCode
	}

	nowTs := pgtype.Timestamptz{Time: s.now().UTC(), Valid: true}
	if err := s.users.UpdateUserEmailVerifiedAt(ctx, db.UpdateUserEmailVerifiedAtParams{
		ID:              user.ID,
		EmailVerifiedAt: nowTs,
		UpdatedAt:       nowTs,
	}); err != nil {
		return nil, err
	}
	if err := s.verifications.DeleteEmailVerificationByUserID(ctx, user.ID); err != nil {
		return nil, err
	}

	membership, environment, err := s.ensurePrimaryTenant(ctx, user.ID, nowTs)
	if err != nil {
		return nil, err
	}

	return s.newAuthResult(ctx, user.ID, membership.OrganizationID, environment.ID, membership.Role, !user.OnboardingCompletedAt.Valid, nowTs)
}

// sendVerificationEmail sends the verification code via the shared mailer.
func (s *Service) sendVerificationEmail(ctx context.Context, toEmail, code string) error {
	return s.mailer.SendVerificationCode(ctx, toEmail, code)
}

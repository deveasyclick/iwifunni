-- name: CreateUser :exec
INSERT INTO users (
	id,
	email,
	password_hash,
	first_name,
	last_name,
	email_verified_at,
	onboarding_completed_at,
	created_at,
	updated_at
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);

-- name: GetUserByEmail :one
SELECT id, email, password_hash, first_name, last_name, email_verified_at, onboarding_completed_at, created_at, updated_at
FROM users
WHERE email = $1;

-- name: GetUserByID :one
SELECT id, email, password_hash, first_name, last_name, email_verified_at, onboarding_completed_at, created_at, updated_at
FROM users
WHERE id = $1;

-- name: UpdateUserEmailVerifiedAt :exec
UPDATE users
SET email_verified_at = $2, updated_at = $3
WHERE id = $1;

-- name: UpdateUserOnboardingCompletedAt :exec
UPDATE users
SET onboarding_completed_at = $2, updated_at = $3
WHERE id = $1;

-- name: UpsertEmailVerification :exec
INSERT INTO email_verifications (
	user_id,
	code_hash,
	expires_at,
	consumed_at,
	created_at,
	updated_at
) VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (user_id) DO UPDATE
SET code_hash = EXCLUDED.code_hash,
	expires_at = EXCLUDED.expires_at,
	consumed_at = EXCLUDED.consumed_at,
	updated_at = EXCLUDED.updated_at;

-- name: GetEmailVerificationByUserID :one
SELECT user_id, code_hash, expires_at, consumed_at, created_at, updated_at
FROM email_verifications
WHERE user_id = $1;

-- name: DeleteEmailVerificationByUserID :exec
DELETE FROM email_verifications
WHERE user_id = $1;

-- name: CreateAuthIdentity :exec
INSERT INTO auth_identities (
	id,
	user_id,
	provider,
	provider_user_id,
	email,
	created_at,
	updated_at
) VALUES ($1, $2, $3, $4, $5, $6, $7);

-- name: GetAuthIdentityByProviderUserID :one
SELECT id, user_id, provider, provider_user_id, email, created_at, updated_at
FROM auth_identities
WHERE provider = $1 AND provider_user_id = $2;

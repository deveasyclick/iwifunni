-- +goose Up
ALTER TABLE users
ADD COLUMN first_name TEXT NOT NULL DEFAULT '',
ADD COLUMN last_name TEXT NOT NULL DEFAULT '',
ADD COLUMN email_verified_at TIMESTAMPTZ,
ADD COLUMN onboarding_completed_at TIMESTAMPTZ;

CREATE TABLE email_verifications (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    code_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_verifications_expires_at ON email_verifications(expires_at);

CREATE TABLE auth_identities (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    provider_user_id TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT auth_identities_provider_check CHECK (provider IN ('google', 'github')),
    CONSTRAINT auth_identities_provider_user_unique UNIQUE (provider, provider_user_id),
    CONSTRAINT auth_identities_user_provider_unique UNIQUE (user_id, provider)
);

CREATE INDEX idx_auth_identities_user_id ON auth_identities(user_id);

-- +goose Down
DROP TABLE IF EXISTS auth_identities;
DROP TABLE IF EXISTS email_verifications;

ALTER TABLE users
DROP COLUMN IF EXISTS onboarding_completed_at,
DROP COLUMN IF EXISTS email_verified_at,
DROP COLUMN IF EXISTS last_name,
DROP COLUMN IF EXISTS first_name;
-- +goose Up
-- ── Notifications ──────────────────────────────────────────────
CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    environment_id UUID REFERENCES environments(id),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    channels TEXT[] NOT NULL,
    recipient JSONB NOT NULL,
    metadata JSONB,
    status TEXT NOT NULL,
    job_id TEXT,
    is_test BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_notifications_job_id
ON notifications(job_id)
WHERE job_id IS NOT NULL;

CREATE INDEX idx_notifications_environment_id_is_test
ON notifications(environment_id, is_test);

-- ── Delivery Attempts ──────────────────────────────────────────
CREATE TABLE delivery_attempts (
    id UUID PRIMARY KEY,
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    channel TEXT NOT NULL,
    destination TEXT NOT NULL,
    status TEXT NOT NULL,
    error_message TEXT,
    provider_message_id TEXT,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Templates ──────────────────────────────────────────────────
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    environment_id UUID NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'push')),
    subject TEXT,
    body TEXT NOT NULL,
    version INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (environment_id, name, channel)
);

CREATE INDEX idx_templates_environment ON templates(environment_id);

-- ── Subscribers ────────────────────────────────────────────────
CREATE TABLE subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    environment_id UUID NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    push_token TEXT,
    channels TEXT[] NOT NULL DEFAULT '{}'::text[],
    status JSONB NOT NULL DEFAULT '{}'::jsonb,
    tags TEXT[] NOT NULL DEFAULT '{}'::text[],
    preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
    subscription_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_notification_date TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT subscribers_contact_check CHECK (
        email IS NOT NULL OR phone IS NOT NULL OR push_token IS NOT NULL
    )
);

CREATE INDEX idx_subscribers_environment_id ON subscribers(environment_id);
CREATE INDEX idx_subscribers_environment_email ON subscribers(environment_id, email);
CREATE INDEX idx_subscribers_environment_phone ON subscribers(environment_id, phone);
CREATE INDEX idx_subscribers_environment_active ON subscribers(environment_id, deleted_at);
CREATE INDEX idx_subscribers_channels ON subscribers USING GIN(channels);
CREATE INDEX idx_subscribers_tags ON subscribers USING GIN(tags);

-- +goose Down
DROP TABLE IF EXISTS subscribers;
DROP TABLE IF EXISTS templates;
DROP TABLE IF EXISTS delivery_attempts;
DROP TABLE IF EXISTS notifications;

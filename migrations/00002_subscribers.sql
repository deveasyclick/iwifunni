-- +goose Up
CREATE TABLE subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    push_token TEXT,
    channels TEXT[] NOT NULL DEFAULT '{}'::text[],
    status JSONB NOT NULL DEFAULT '{}'::jsonb,
    tags TEXT[] NOT NULL DEFAULT '{}'::text[],
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

CREATE INDEX idx_subscribers_project_id ON subscribers(project_id);
CREATE INDEX idx_subscribers_project_email ON subscribers(project_id, email);
CREATE INDEX idx_subscribers_project_phone ON subscribers(project_id, phone);
CREATE INDEX idx_subscribers_project_active ON subscribers(project_id, deleted_at);
CREATE INDEX idx_subscribers_channels ON subscribers USING GIN(channels);
CREATE INDEX idx_subscribers_tags ON subscribers USING GIN(tags);

-- +goose Down
DROP TABLE IF EXISTS subscribers;
-- +goose Up
-- ── Integrations (notification delivery providers) ─────────────
CREATE TABLE integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    environment_id UUID NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    channel TEXT NOT NULL,
    credentials JSONB NOT NULL,
    config JSONB,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (environment_id, name),
    CONSTRAINT integrations_primary_requires_active CHECK (NOT is_primary OR is_active)
);

CREATE INDEX idx_integrations_environment ON integrations(environment_id);

CREATE UNIQUE INDEX idx_integrations_primary_per_channel
ON integrations(environment_id, channel)
WHERE is_primary = true;

-- +goose Down
DROP TABLE IF EXISTS integrations;

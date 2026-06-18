-- +goose Up
-- Drop service_id from notifications (moved to nullable in 00016, now fully removed)
ALTER TABLE notifications DROP COLUMN IF EXISTS service_id;

-- Drop legacy service tables
DROP TABLE IF EXISTS service_channel_configs;
DROP TABLE IF EXISTS services;

-- +goose Down
CREATE TABLE services (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    api_key TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE service_channel_configs (
    id UUID PRIMARY KEY,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    channel TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    provider TEXT NOT NULL,
    config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (service_id, channel)
);

ALTER TABLE notifications ADD COLUMN service_id UUID REFERENCES services(id) ON DELETE SET NULL;

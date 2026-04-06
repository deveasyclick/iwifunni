-- +goose Up
CREATE TABLE services (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    api_key TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users_preferences (
    user_id TEXT PRIMARY KEY,
    email_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
    sms_opt_in BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE push_subscriptions (
    id UUID PRIMARY KEY,
    user_id TEXT NOT NULL,
    channel TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    service_id UUID NOT NULL REFERENCES services(id),
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    channels TEXT[] NOT NULL,
    metadata JSONB,
    status TEXT NOT NULL,
    retry_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE in_app_notifications (
    id UUID PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- +goose Down
DROP TABLE in_app_notifications;
DROP TABLE notifications;
DROP TABLE push_subscriptions;
DROP TABLE users_preferences;
DROP TABLE services;

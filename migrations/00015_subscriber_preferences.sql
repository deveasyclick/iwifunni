-- +goose Up
ALTER TABLE subscribers ADD COLUMN preferences JSONB NOT NULL DEFAULT '{}'::jsonb;

-- +goose Down
ALTER TABLE subscribers DROP COLUMN preferences;

-- +goose Up
-- ── Subscriber first_name / last_name ──────────────────────────
ALTER TABLE subscribers
    ADD COLUMN first_name TEXT,
    ADD COLUMN last_name TEXT;

-- +goose Down
ALTER TABLE subscribers
    DROP COLUMN IF EXISTS first_name,
    DROP COLUMN IF EXISTS last_name;

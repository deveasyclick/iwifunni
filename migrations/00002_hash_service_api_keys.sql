-- +goose Up
CREATE EXTENSION IF NOT EXISTS pgcrypto;

UPDATE services
SET api_key = encode(digest(api_key, 'sha256'), 'hex');

-- +goose Down
SELECT 1;
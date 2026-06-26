-- name: GetActiveEnvironmentIntegrationsByChannel :many
SELECT id, environment_id, name, channel, credentials, config, is_active, is_primary, created_at, updated_at
FROM integrations
WHERE environment_id = $1 AND channel = $2 AND is_active = true
ORDER BY is_primary DESC, created_at ASC;

-- name: CreateIntegration :one
INSERT INTO integrations (id, environment_id, name, channel, credentials, config, is_active, is_primary)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- name: ListIntegrations :many
SELECT id, environment_id, name, channel, credentials, config, is_active, is_primary, created_at, updated_at
FROM integrations
WHERE environment_id = $1
ORDER BY channel, is_primary DESC, name;

-- name: ListIntegrationsByChannel :many
SELECT id, environment_id, name, channel, credentials, config, is_active, is_primary, created_at, updated_at
FROM integrations
WHERE environment_id = $1 AND channel = $2
ORDER BY is_primary DESC, created_at ASC;

-- name: GetIntegrationByID :one
SELECT id, environment_id, name, channel, credentials, config, is_active, is_primary, created_at, updated_at
FROM integrations
WHERE id = $1 AND environment_id = $2;

-- name: UpdateIntegration :one
UPDATE integrations
SET name = $3, channel = $4, credentials = $5, config = $6, updated_at = now()
WHERE id = $1 AND environment_id = $2
RETURNING *;

-- name: UpdateIntegrationState :one
UPDATE integrations
SET is_active = $3, is_primary = $4, updated_at = now()
WHERE id = $1 AND environment_id = $2
RETURNING *;

-- name: ClearIntegrationPrimaryByChannel :exec
UPDATE integrations
SET is_primary = false, updated_at = now()
WHERE environment_id = $1 AND channel = $2 AND is_primary = true;

-- name: DeleteIntegration :exec
DELETE FROM integrations
WHERE id = $1 AND environment_id = $2;


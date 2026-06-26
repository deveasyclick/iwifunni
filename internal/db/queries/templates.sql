-- name: CreateTemplate :one
INSERT INTO templates (id, environment_id, name, channel, subject, body)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: UpsertTemplate :one
INSERT INTO templates (id, environment_id, name, channel, subject, body)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (environment_id, name, channel)
DO UPDATE SET subject = $5, body = $6, version = templates.version + 1, updated_at = NOW()
RETURNING *;

-- name: GetTemplateByID :one
SELECT * FROM templates
WHERE id = $1 AND environment_id = $2;

-- name: GetTemplateByName :one
SELECT * FROM templates
WHERE environment_id = $1 AND name = $2 AND channel = $3 AND is_active = true
ORDER BY version DESC
LIMIT 1;

-- name: ListTemplates :many
SELECT * FROM templates
WHERE environment_id = $1
ORDER BY name, channel;

-- name: UpdateTemplate :one
UPDATE templates
SET subject = $3, body = $4, version = version + 1, updated_at = now()
WHERE id = $1 AND environment_id = $2
RETURNING *;

-- name: DeleteTemplate :exec
UPDATE templates
SET is_active = false, updated_at = now()
WHERE id = $1 AND environment_id = $2;

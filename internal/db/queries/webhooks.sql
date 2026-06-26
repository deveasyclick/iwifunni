-- name: CreateWebhook :one
INSERT INTO webhooks (id, environment_id, url, secret, events, is_active, created_at, updated_at)
VALUES ($1, $2, $3, $4, $5, true, $6, $7)
RETURNING *;

-- name: ListWebhooksByEnvironment :many
SELECT id, environment_id, url, secret, events, is_active, created_at, updated_at
FROM webhooks
WHERE environment_id = $1 AND is_active = true
ORDER BY created_at DESC;

-- name: GetWebhookByID :one
SELECT id, environment_id, url, secret, events, is_active, created_at, updated_at
FROM webhooks
WHERE id = $1 AND environment_id = $2;

-- name: DeleteWebhook :exec
UPDATE webhooks
SET is_active = false, updated_at = now()
WHERE id = $1 AND environment_id = $2;

-- name: ListActiveWebhooksForEvent :many
SELECT id, environment_id, url, secret, events, is_active, created_at, updated_at
FROM webhooks
WHERE environment_id = $1 AND is_active = true AND $2::text = ANY(events);

-- name: InsertWebhookDelivery :exec
INSERT INTO webhook_deliveries (id, webhook_id, event, payload, status, response_code, error_message, attempted_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8);

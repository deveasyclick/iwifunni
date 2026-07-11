-- name: UpsertNotificationByEnvironmentJob :one
INSERT INTO notifications (id, job_id, environment_id, title, message, channels, recipient, metadata, status, is_test, created_at, updated_at)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
ON CONFLICT (job_id) WHERE job_id IS NOT NULL DO UPDATE
SET title = EXCLUDED.title,
	message = EXCLUDED.message,
	channels = EXCLUDED.channels,
	recipient = EXCLUDED.recipient,
	metadata = EXCLUDED.metadata,
	status = EXCLUDED.status,
	updated_at = EXCLUDED.updated_at
RETURNING id, title, message, channels, recipient, metadata, status, environment_id, job_id, is_test, created_at, updated_at;

-- name: ListEnvironmentNotifications :many
SELECT id, title, message, channels, recipient, metadata, status, environment_id, job_id, is_test, created_at, updated_at
FROM notifications
WHERE environment_id = $1
  AND ($2::bool OR is_test = false)
ORDER BY created_at DESC;

-- name: GetEnvironmentNotificationByID :one
SELECT id, title, message, channels, recipient, metadata, status, environment_id, job_id, is_test, created_at, updated_at
FROM notifications
WHERE id = $1 AND environment_id = $2;

-- name: GetNotificationByJobID :one
SELECT id, title, message, channels, recipient, metadata, status, environment_id, job_id, is_test, created_at, updated_at
FROM notifications
WHERE job_id = $1;

-- name: UpdateNotificationStatus :exec
UPDATE notifications
SET status = $1, updated_at = $2
WHERE id = $3;

-- name: UpsertDeliveryAttempt :exec
INSERT INTO delivery_attempts (id, notification_id, channel, destination, status, error_message, provider_message_id, attempted_at)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
ON CONFLICT (notification_id, channel) DO UPDATE
SET status = EXCLUDED.status,
    error_message = EXCLUDED.error_message,
    destination = EXCLUDED.destination,
    provider_message_id = EXCLUDED.provider_message_id,
    attempted_at = EXCLUDED.attempted_at;

-- name: ListDeliveryAttemptsByNotificationID :many
SELECT id, notification_id, channel, destination, status, error_message, provider_message_id, attempted_at
FROM delivery_attempts
WHERE notification_id = $1
ORDER BY attempted_at ASC;

-- name: ListNotificationsByWorkflowID :many
SELECT id, title, message, channels, status, is_test, created_at, updated_at
FROM notifications
WHERE environment_id = $1 AND metadata @> $2::jsonb
ORDER BY created_at DESC
LIMIT $3;

-- name: GetServiceByAPIKey :one
SELECT id, name, api_key, description, created_at
FROM services
WHERE api_key = $1;

-- name: InsertNotification :exec
INSERT INTO notifications (id, service_id, user_id, title, message, channels, metadata, status, retry_count, created_at, updated_at)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11);

-- name: InsertInAppNotification :exec
INSERT INTO in_app_notifications (id, user_id, title, message, metadata, created_at)
VALUES ($1,$2,$3,$4,$5,$6);

-- name: GetUserPreferences :one
SELECT user_id, email_opt_in, sms_opt_in
FROM users_preferences
WHERE user_id = $1;

-- name: GetPushSubscriptions :many
SELECT id, user_id, channel, endpoint, created_at
FROM push_subscriptions
WHERE user_id = $1;

-- name: UpsertInAppNotification :exec
INSERT INTO in_app_notifications (id, user_id, title, message, metadata, created_at) VALUES ($1,$2,$3,$4,$5,$6);
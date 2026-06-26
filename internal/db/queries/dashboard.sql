-- name: DashboardSubscriberCount :one
SELECT COUNT(*)::bigint AS count
FROM subscribers
WHERE environment_id = $1 AND deleted_at IS NULL;

-- name: DashboardNotificationCount :one
SELECT COUNT(*)::bigint AS count
FROM notifications
WHERE environment_id = $1 AND is_test = false;

-- name: DashboardNotificationStats :many
SELECT status, COUNT(*)::bigint AS count
FROM notifications
WHERE environment_id = $1 AND is_test = false
GROUP BY status;

-- name: DashboardDailyActivity :many
SELECT
    DATE(created_at)::date AS day,
    COUNT(*)::bigint AS total,
    COUNT(*) FILTER (WHERE status IN ('sent', 'partial_failed'))::bigint AS delivered
FROM notifications
WHERE environment_id = $1 AND created_at >= $2 AND is_test = false
GROUP BY DATE(created_at)
ORDER BY day;

-- name: DashboardChannelBreakdown :many
SELECT da.channel, COUNT(*)::bigint AS count
FROM delivery_attempts da
JOIN notifications n ON n.id = da.notification_id
WHERE n.environment_id = $1 AND n.is_test = false
GROUP BY da.channel;

-- name: DashboardRecentNotifications :many
SELECT id, title, message, channels, status, created_at
FROM notifications
WHERE environment_id = $1 AND is_test = false
ORDER BY created_at DESC
LIMIT $2;

-- name: DashboardWorkflowCount :one
SELECT COUNT(*)::bigint AS count
FROM workflows
WHERE environment_id = $1 AND status <> 'archived';

-- name: DashboardActiveIntegrationCount :one
SELECT COUNT(*)::bigint AS count
FROM integrations
WHERE environment_id = $1 AND is_active = true;

-- name: DashboardActiveIntegrations :many
SELECT name, channel
FROM integrations
WHERE environment_id = $1 AND is_active = true
ORDER BY name;

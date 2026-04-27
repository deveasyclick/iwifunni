-- name: GetServiceByAPIKey :one
SELECT id, name, api_key, description, created_at
FROM services
WHERE api_key = $1;

-- name: InsertService :exec
INSERT INTO services (id, name, api_key, description)
VALUES ($1, $2, $3, $4);

-- name: InsertNotificationByProject :exec
INSERT INTO notifications (id, project_id, title, message, channels, recipient, metadata, status, created_at, updated_at)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10);

-- name: GetActiveProjectProviderByChannel :one
SELECT id, project_id, name, channel, credentials, config, is_active, created_at, updated_at
FROM providers
WHERE project_id = $1 AND channel = $2 AND is_active = true
LIMIT 1;

-- name: GetServiceChannelConfig :one
SELECT id, service_id, channel, enabled, provider, config_json, created_at, updated_at
FROM service_channel_configs
WHERE service_id = $1 AND channel = $2;

-- name: InsertNotification :exec
INSERT INTO notifications (id, service_id, title, message, channels, recipient, metadata, status, created_at, updated_at)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10);

-- name: UpdateNotificationStatus :exec
UPDATE notifications
SET status = $1, updated_at = $2
WHERE id = $3;

-- name: InsertDeliveryAttempt :exec
INSERT INTO delivery_attempts (id, notification_id, channel, destination, status, error_message, provider_message_id, attempted_at)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8);

-- name: CreateUser :exec
INSERT INTO users (id, email, password_hash, created_at, updated_at)
VALUES ($1, $2, $3, $4, $5);

-- name: GetUserByEmail :one
SELECT id, email, password_hash, created_at, updated_at
FROM users
WHERE email = $1;

-- name: CreateProject :exec
INSERT INTO projects (id, name, created_at, updated_at)
VALUES ($1, $2, $3, $4);

-- name: GetProject :one
SELECT id, name, created_at, updated_at
FROM projects
WHERE id = $1;

-- name: CreateProjectMembership :exec
INSERT INTO project_memberships (id, project_id, user_id, role, created_at, updated_at)
VALUES ($1, $2, $3, $4, $5, $6);

-- name: GetProjectMembershipByUser :one
SELECT id, project_id, user_id, role, created_at, updated_at
FROM project_memberships
WHERE project_id = $1 AND user_id = $2;

-- name: GetFirstProjectMembershipByUser :one
SELECT id, project_id, user_id, role, created_at, updated_at
FROM project_memberships
WHERE user_id = $1
ORDER BY created_at ASC
LIMIT 1;

-- name: CreateAPIKey :exec
INSERT INTO api_keys (
	id,
	project_id,
	name,
	key_prefix,
	key_hash,
	scopes,
	status,
	expires_at,
	rotated_from,
	created_at,
	updated_at
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);

-- name: GetAPIKeyByPrefix :one
SELECT id, project_id, name, key_prefix, key_hash, scopes, status, last_used_at, expires_at, revoked_at, rotated_from, created_at, updated_at
FROM api_keys
WHERE key_prefix = $1;

-- name: ListAPIKeysByProject :many
SELECT id, project_id, name, key_prefix, key_hash, scopes, status, last_used_at, expires_at, revoked_at, rotated_from, created_at, updated_at
FROM api_keys
WHERE project_id = $1
ORDER BY created_at DESC;

-- name: TouchAPIKeyLastUsed :exec
UPDATE api_keys
SET last_used_at = $1, updated_at = $2
WHERE id = $3;

-- name: UpdateAPIKeyStatus :exec
UPDATE api_keys
SET status = $1, revoked_at = $2, updated_at = $3
WHERE id = $4;

-- name: CreateRefreshToken :exec
INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at, updated_at)
VALUES ($1, $2, $3, $4, $5, $6);

-- name: GetRefreshTokenByHash :one
SELECT id, user_id, token_hash, expires_at, created_at, updated_at
FROM refresh_tokens
WHERE token_hash = $1;

-- name: DeleteRefreshTokenByHash :exec
DELETE FROM refresh_tokens
WHERE token_hash = $1;

-- name: CreateTemplate :one
INSERT INTO templates (id, project_id, name, channel, subject, body)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetTemplateByID :one
SELECT * FROM templates
WHERE id = $1 AND project_id = $2;

-- name: GetTemplateByName :one
SELECT * FROM templates
WHERE project_id = $1 AND name = $2 AND channel = $3 AND is_active = true
ORDER BY version DESC
LIMIT 1;

-- name: ListTemplates :many
SELECT * FROM templates
WHERE project_id = $1
ORDER BY name, channel;

-- name: UpdateTemplate :one
UPDATE templates
SET subject = $3, body = $4, version = version + 1, updated_at = now()
WHERE id = $1 AND project_id = $2
RETURNING *;

-- name: DeleteTemplate :exec
UPDATE templates
SET is_active = false, updated_at = now()
WHERE id = $1 AND project_id = $2;

-- name: CreateProvider :one
INSERT INTO providers (id, project_id, name, channel, credentials, config, is_active)
VALUES ($1, $2, $3, $4, $5, $6, true)
RETURNING *;

-- name: ListProviders :many
SELECT id, project_id, name, channel, credentials, config, is_active, created_at, updated_at
FROM providers
WHERE project_id = $1 AND is_active = true
ORDER BY name;

-- name: GetProviderByID :one
SELECT id, project_id, name, channel, credentials, config, is_active, created_at, updated_at
FROM providers
WHERE id = $1 AND project_id = $2;

-- name: UpdateProvider :one
UPDATE providers
SET name = $3, channel = $4, credentials = $5, config = $6, updated_at = now()
WHERE id = $1 AND project_id = $2
RETURNING *;

-- name: DeleteProvider :exec
UPDATE providers
SET is_active = false, updated_at = now()
WHERE id = $1 AND project_id = $2;

-- name: CreateWebhook :one
INSERT INTO webhooks (id, project_id, url, secret, events, is_active, created_at, updated_at)
VALUES ($1, $2, $3, $4, $5, true, $6, $7)
RETURNING *;

-- name: ListWebhooksByProject :many
SELECT id, project_id, url, secret, events, is_active, created_at, updated_at
FROM webhooks
WHERE project_id = $1 AND is_active = true
ORDER BY created_at DESC;

-- name: GetWebhookByID :one
SELECT id, project_id, url, secret, events, is_active, created_at, updated_at
FROM webhooks
WHERE id = $1 AND project_id = $2;

-- name: DeleteWebhook :exec
UPDATE webhooks
SET is_active = false, updated_at = now()
WHERE id = $1 AND project_id = $2;

-- name: ListActiveWebhooksForEvent :many
SELECT id, project_id, url, secret, events, is_active, created_at, updated_at
FROM webhooks
WHERE project_id = $1 AND is_active = true AND $2 = ANY(events);

-- name: InsertWebhookDelivery :exec
INSERT INTO webhook_deliveries (id, webhook_id, event, payload, status, response_code, error_message, attempted_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8);

-- name: CreateOrganization :one
INSERT INTO organizations (id, name, created_at, updated_at)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetOrganizationByID :one
SELECT id, name, created_at, updated_at
FROM organizations
WHERE id = $1;

-- name: ListOrganizationsByUser :many
SELECT o.id, o.name, o.created_at, o.updated_at
FROM organizations o
JOIN organization_members om ON om.organization_id = o.id
WHERE om.user_id = $1
ORDER BY o.created_at ASC;

-- name: CreateOrganizationMember :exec
INSERT INTO organization_members (id, organization_id, user_id, role, created_at)
VALUES ($1, $2, $3, $4, $5);

-- name: GetOrganizationMember :one
SELECT id, organization_id, user_id, role, created_at
FROM organization_members
WHERE organization_id = $1 AND user_id = $2;

-- name: ListProjectsByOrganization :many
SELECT id, organization_id, name, created_at, updated_at
FROM projects
WHERE organization_id = $1
ORDER BY created_at ASC;

-- name: CreateProjectWithOrg :one
INSERT INTO projects (id, organization_id, name, created_at, updated_at)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetProjectByID :one
SELECT id, organization_id, name, created_at, updated_at
FROM projects
WHERE id = $1;
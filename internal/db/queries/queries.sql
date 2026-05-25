-- name: GetServiceByAPIKey :one
SELECT id, name, api_key, description, created_at
FROM services
WHERE api_key = $1;

-- name: InsertService :exec
INSERT INTO services (id, name, api_key, description)
VALUES ($1, $2, $3, $4);

-- name: UpsertNotificationByEnvironmentJob :one
INSERT INTO notifications (id, job_id, environment_id, title, message, channels, recipient, metadata, status, created_at, updated_at)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
ON CONFLICT (job_id) WHERE job_id IS NOT NULL DO UPDATE
SET title = EXCLUDED.title,
	message = EXCLUDED.message,
	channels = EXCLUDED.channels,
	recipient = EXCLUDED.recipient,
	metadata = EXCLUDED.metadata,
	updated_at = EXCLUDED.updated_at
RETURNING id, service_id, title, message, channels, recipient, metadata, status, environment_id, job_id, created_at, updated_at;

-- name: GetActiveEnvironmentProvidersByChannel :many
SELECT id, environment_id, name, channel, credentials, config, is_active, is_primary, created_at, updated_at
FROM providers
WHERE environment_id = $1 AND channel = $2 AND is_active = true
ORDER BY is_primary DESC, created_at ASC;

-- name: GetServiceChannelConfig :one
SELECT id, service_id, channel, enabled, provider, config_json, created_at, updated_at
FROM service_channel_configs
WHERE service_id = $1 AND channel = $2;

-- name: UpsertNotificationByServiceJob :one
INSERT INTO notifications (id, job_id, service_id, title, message, channels, recipient, metadata, status, created_at, updated_at)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
ON CONFLICT (job_id) WHERE job_id IS NOT NULL DO UPDATE
SET title = EXCLUDED.title,
	message = EXCLUDED.message,
	channels = EXCLUDED.channels,
	recipient = EXCLUDED.recipient,
	metadata = EXCLUDED.metadata,
	updated_at = EXCLUDED.updated_at
RETURNING id, service_id, title, message, channels, recipient, metadata, status, environment_id, job_id, created_at, updated_at;

-- name: ListEnvironmentNotifications :many
SELECT id, service_id, title, message, channels, recipient, metadata, status, environment_id, job_id, created_at, updated_at
FROM notifications
WHERE environment_id = $1
ORDER BY created_at DESC;

-- name: GetEnvironmentNotificationByID :one
SELECT id, service_id, title, message, channels, recipient, metadata, status, environment_id, job_id, created_at, updated_at
FROM notifications
WHERE id = $1 AND environment_id = $2;

-- name: GetNotificationByJobID :one
SELECT id, service_id, title, message, channels, recipient, metadata, status, environment_id, job_id, created_at, updated_at
FROM notifications
WHERE job_id = $1;

-- name: UpdateNotificationStatus :exec
UPDATE notifications
SET status = $1, updated_at = $2
WHERE id = $3;

-- name: InsertDeliveryAttempt :exec
INSERT INTO delivery_attempts (id, notification_id, channel, destination, status, error_message, provider_message_id, attempted_at)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8);

-- name: CreateUser :exec
INSERT INTO users (
	id,
	email,
	password_hash,
	first_name,
	last_name,
	email_verified_at,
	onboarding_completed_at,
	created_at,
	updated_at
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);

-- name: GetUserByEmail :one
SELECT id, email, password_hash, first_name, last_name, email_verified_at, onboarding_completed_at, created_at, updated_at
FROM users
WHERE email = $1;

-- name: GetUserByID :one
SELECT id, email, password_hash, first_name, last_name, email_verified_at, onboarding_completed_at, created_at, updated_at
FROM users
WHERE id = $1;

-- name: UpdateUserEmailVerifiedAt :exec
UPDATE users
SET email_verified_at = $2, updated_at = $3
WHERE id = $1;

-- name: UpdateUserOnboardingCompletedAt :exec
UPDATE users
SET onboarding_completed_at = $2, updated_at = $3
WHERE id = $1;

-- name: UpsertEmailVerification :exec
INSERT INTO email_verifications (
	user_id,
	code_hash,
	expires_at,
	consumed_at,
	created_at,
	updated_at
) VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (user_id) DO UPDATE
SET code_hash = EXCLUDED.code_hash,
	expires_at = EXCLUDED.expires_at,
	consumed_at = EXCLUDED.consumed_at,
	updated_at = EXCLUDED.updated_at;

-- name: GetEmailVerificationByUserID :one
SELECT user_id, code_hash, expires_at, consumed_at, created_at, updated_at
FROM email_verifications
WHERE user_id = $1;

-- name: DeleteEmailVerificationByUserID :exec
DELETE FROM email_verifications
WHERE user_id = $1;

-- name: CreateAuthIdentity :exec
INSERT INTO auth_identities (
	id,
	user_id,
	provider,
	provider_user_id,
	email,
	created_at,
	updated_at
) VALUES ($1, $2, $3, $4, $5, $6, $7);

-- name: GetAuthIdentityByProviderUserID :one
SELECT id, user_id, provider, provider_user_id, email, created_at, updated_at
FROM auth_identities
WHERE provider = $1 AND provider_user_id = $2;

-- name: CreateEnvironment :one
INSERT INTO environments (id, organization_id, name, is_default, created_at, updated_at)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetEnvironmentByID :one
SELECT id, organization_id, name, is_default, created_at, updated_at
FROM environments
WHERE id = $1;

-- name: UpdateEnvironmentName :exec
UPDATE environments
SET name = $2, updated_at = $3
WHERE id = $1;

-- name: GetOrganizationMembershipByUser :one
SELECT id, organization_id, user_id, role, created_at
FROM organization_members
WHERE organization_id = $1 AND user_id = $2;

-- name: GetFirstOrganizationMembershipByUser :one
SELECT id, organization_id, user_id, role, created_at
FROM organization_members
WHERE user_id = $1
ORDER BY created_at ASC
LIMIT 1;

-- name: CreateAPIKey :exec
INSERT INTO api_keys (
	id,
	environment_id,
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
SELECT id, environment_id, name, key_prefix, key_hash, scopes, status, last_used_at, expires_at, revoked_at, rotated_from, created_at, updated_at
FROM api_keys
WHERE key_prefix = $1;

-- name: ListAPIKeysByEnvironment :many
SELECT id, environment_id, name, key_prefix, key_hash, scopes, status, last_used_at, expires_at, revoked_at, rotated_from, created_at, updated_at
FROM api_keys
WHERE environment_id = $1
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
INSERT INTO templates (id, environment_id, name, channel, subject, body)
VALUES ($1, $2, $3, $4, $5, $6)
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

-- name: CreateSubscriber :one
INSERT INTO subscribers (
	id,
	environment_id,
	name,
	email,
	phone,
	push_token,
	channels,
	status,
	tags,
	metadata
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
RETURNING *;

-- name: ListSubscribersByEnvironment :many
SELECT * FROM subscribers
WHERE environment_id = $1 AND deleted_at IS NULL
ORDER BY subscription_date DESC;

-- name: GetSubscriberByID :one
SELECT * FROM subscribers
WHERE id = $1 AND environment_id = $2 AND deleted_at IS NULL;

-- name: UpdateSubscriber :one
UPDATE subscribers
SET name = $3,
	email = $4,
	phone = $5,
	push_token = $6,
	channels = $7,
	status = $8,
	tags = $9,
	metadata = $10,
	updated_at = now()
WHERE id = $1 AND environment_id = $2 AND deleted_at IS NULL
RETURNING *;

-- name: DeleteSubscriber :exec
UPDATE subscribers
SET deleted_at = now(), updated_at = now()
WHERE id = $1 AND environment_id = $2 AND deleted_at IS NULL;

-- name: CreateWorkflow :one
INSERT INTO workflows (
	id,
	environment_id,
	key,
	name,
	description,
	channels,
	template_ids,
	is_active
)
VALUES ($1, $2, $3, $4, $5, $6, $7, true)
RETURNING *;

-- name: ListWorkflowsByEnvironment :many
SELECT * FROM workflows
WHERE environment_id = $1
	AND status <> 'archived'
ORDER BY updated_at DESC;

-- name: GetWorkflowByID :one
SELECT * FROM workflows
WHERE id = $1 AND environment_id = $2;

-- name: UpdateWorkflow :one
UPDATE workflows
SET key = $3,
	name = $4,
	description = $5,
	channels = $6,
	template_ids = $7,
	is_active = $8,
	updated_at = now()
WHERE id = $1 AND environment_id = $2
RETURNING *;

-- name: DeleteWorkflow :exec
UPDATE workflows
SET is_active = false,
	status = 'archived',
	updated_at = now()
WHERE id = $1 AND environment_id = $2;

-- name: CreateWorkflowDefinition :one
INSERT INTO workflows (
	id,
	environment_id,
	key,
	name,
	description,
	status,
	version,
	trigger_event,
	definition_json,
	is_active
)
VALUES (
	$1,
	$2,
	$3,
	$4,
	$5,
	$6,
	$7,
	$8,
	$9,
	CASE WHEN $6 = 'active' THEN true ELSE false END
)
RETURNING *;

-- name: ListWorkflowDefinitionsByEnvironment :many
SELECT * FROM workflows
WHERE environment_id = $1
ORDER BY updated_at DESC;

-- name: GetWorkflowDefinitionByID :one
SELECT * FROM workflows
WHERE id = $1 AND environment_id = $2;

-- name: UpdateWorkflowDefinition :one
UPDATE workflows
SET key = $3,
	name = $4,
	description = $5,
	status = $6,
	version = $7,
	trigger_event = $8,
	definition_json = $9,
	is_active = CASE WHEN $6 = 'active' THEN true ELSE false END,
	updated_at = now()
WHERE id = $1 AND environment_id = $2
RETURNING *;

-- name: GetActiveWorkflowsByTriggerEvent :many
SELECT * FROM workflows
WHERE environment_id = $1
	AND trigger_event = $2
	AND status = 'active'
ORDER BY updated_at DESC;

-- name: CreateWorkflowExecution :one
INSERT INTO workflow_executions (
	id,
	workflow_id,
	environment_id,
	subscriber_id,
	status,
	current_step_id,
	trigger_payload
)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: ListWorkflowExecutionsByEnvironment :many
SELECT * FROM workflow_executions
WHERE environment_id = $1
ORDER BY started_at DESC;

-- name: ListWorkflowExecutionsByWorkflow :many
SELECT * FROM workflow_executions
WHERE workflow_id = $1 AND environment_id = $2
ORDER BY started_at DESC;

-- name: GetWorkflowExecutionByID :one
SELECT * FROM workflow_executions
WHERE id = $1 AND environment_id = $2;

-- name: UpdateWorkflowExecutionState :one
UPDATE workflow_executions
SET status = $3,
	current_step_id = $4,
	completed_at = $5,
	failed_at = $6,
	updated_at = now()
WHERE id = $1 AND environment_id = $2
RETURNING *;

-- name: CreateWorkflowStepExecution :one
INSERT INTO workflow_step_executions (
	id,
	execution_id,
	step_id,
	step_type,
	status,
	attempts,
	input_json,
	output_json,
	error_json,
	started_at,
	completed_at,
	failed_at
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
RETURNING *;

-- name: GetWorkflowStepExecution :one
SELECT * FROM workflow_step_executions
WHERE execution_id = $1 AND step_id = $2;

-- name: ListWorkflowStepExecutionsByExecution :many
SELECT * FROM workflow_step_executions
WHERE execution_id = $1
ORDER BY created_at ASC;

-- name: UpdateWorkflowStepExecutionState :one
UPDATE workflow_step_executions
SET status = $3,
	attempts = $4,
	input_json = $5,
	output_json = $6,
	error_json = $7,
	started_at = $8,
	completed_at = $9,
	failed_at = $10,
	updated_at = now()
WHERE execution_id = $1 AND step_id = $2
RETURNING *;

-- name: CreateProvider :one
INSERT INTO providers (id, environment_id, name, channel, credentials, config, is_active, is_primary)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- name: ListProviders :many
SELECT id, environment_id, name, channel, credentials, config, is_active, is_primary, created_at, updated_at
FROM providers
WHERE environment_id = $1
ORDER BY channel, is_primary DESC, name;

-- name: ListProvidersByChannel :many
SELECT id, environment_id, name, channel, credentials, config, is_active, is_primary, created_at, updated_at
FROM providers
WHERE environment_id = $1 AND channel = $2
ORDER BY is_primary DESC, created_at ASC;

-- name: GetProviderByID :one
SELECT id, environment_id, name, channel, credentials, config, is_active, is_primary, created_at, updated_at
FROM providers
WHERE id = $1 AND environment_id = $2;

-- name: UpdateProvider :one
UPDATE providers
SET name = $3, channel = $4, credentials = $5, config = $6, updated_at = now()
WHERE id = $1 AND environment_id = $2
RETURNING *;

-- name: UpdateProviderState :one
UPDATE providers
SET is_active = $3, is_primary = $4, updated_at = now()
WHERE id = $1 AND environment_id = $2
RETURNING *;

-- name: ClearProviderPrimaryByChannel :exec
UPDATE providers
SET is_primary = false, updated_at = now()
WHERE environment_id = $1 AND channel = $2 AND is_primary = true;

-- name: DeleteProvider :exec
DELETE FROM providers
WHERE id = $1 AND environment_id = $2;

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
WHERE environment_id = $1 AND is_active = true AND $2 = ANY(events);

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

-- name: UpdateOrganizationName :exec
UPDATE organizations
SET name = $2, updated_at = $3
WHERE id = $1;

-- name: ListOrganizationsByUser :many
SELECT o.id, o.name, o.created_at, o.updated_at
FROM organizations o
JOIN organization_members om ON om.organization_id = o.id
WHERE om.user_id = $1
ORDER BY o.created_at ASC;

-- name: GetFirstOrganizationByUser :one
SELECT o.id, o.name, o.created_at, o.updated_at
FROM organizations o
JOIN organization_members om ON om.organization_id = o.id
WHERE om.user_id = $1
ORDER BY o.created_at ASC
LIMIT 1;

-- name: CreateOrganizationMember :exec
INSERT INTO organization_members (id, organization_id, user_id, role, created_at)
VALUES ($1, $2, $3, $4, $5);

-- name: GetOrganizationMember :one
SELECT id, organization_id, user_id, role, created_at
FROM organization_members
WHERE organization_id = $1 AND user_id = $2;

-- name: ListEnvironmentsByOrganization :many
SELECT id, organization_id, name, is_default, created_at, updated_at
FROM environments
WHERE organization_id = $1
ORDER BY created_at ASC;

-- name: CreateEnvironmentWithOrg :one
INSERT INTO environments (id, organization_id, name, is_default, created_at, updated_at)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetEnvironment :one
SELECT id, organization_id, name, is_default, created_at, updated_at
FROM environments
WHERE id = $1;

-- name: GetDefaultEnvironmentByOrganization :one
SELECT id, organization_id, name, is_default, created_at, updated_at
FROM environments
WHERE organization_id = $1 AND is_default = true
LIMIT 1;

-- name: ClearDefaultEnvironmentByOrganization :exec
UPDATE environments
SET is_default = false, updated_at = $2
WHERE organization_id = $1 AND is_default = true;

-- name: SetEnvironmentDefault :exec
UPDATE environments
SET is_default = $2, updated_at = $3
WHERE id = $1;

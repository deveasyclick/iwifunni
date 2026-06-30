-- name: CreateAPIKey :exec
INSERT INTO apikeys (
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
FROM apikeys
WHERE key_prefix = $1;

-- name: ListAPIKeysByEnvironment :many
SELECT id, environment_id, name, key_prefix, key_hash, scopes, status, last_used_at, expires_at, revoked_at, rotated_from, created_at, updated_at
FROM apikeys
WHERE environment_id = $1
ORDER BY created_at DESC;

-- name: TouchAPIKeyLastUsed :exec
UPDATE apikeys
SET last_used_at = $1, updated_at = $2
WHERE id = $3;

-- name: DeleteAPIKey :exec
DELETE FROM apikeys WHERE id = $1;

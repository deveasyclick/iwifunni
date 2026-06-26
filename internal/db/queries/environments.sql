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

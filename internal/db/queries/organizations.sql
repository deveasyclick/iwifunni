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

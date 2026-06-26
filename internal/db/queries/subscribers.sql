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
	metadata,
	preferences
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
	preferences = $11,
	updated_at = now()
WHERE id = $1 AND environment_id = $2 AND deleted_at IS NULL
RETURNING *;

-- name: DeleteSubscriber :exec
UPDATE subscribers
SET deleted_at = now(), updated_at = now()
WHERE id = $1 AND environment_id = $2 AND deleted_at IS NULL;

-- name: SearchSubscribers :many
SELECT * FROM subscribers
WHERE environment_id = $1 AND deleted_at IS NULL
  AND (LOWER(name) LIKE LOWER($2) OR LOWER(COALESCE(email, '')) LIKE LOWER($2))
ORDER BY subscription_date DESC;

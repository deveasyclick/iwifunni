-- name: CreateSubscriber :one
INSERT INTO subscribers (
	id,
	environment_id,
	name,
	first_name,
	last_name,
	email,
	phone,
	push_token,
	channels,
	status,
	tags,
	metadata,
	preferences
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
	first_name = $4,
	last_name = $5,
	email = $6,
	phone = $7,
	push_token = $8,
	channels = $9,
	status = $10,
	tags = $11,
	metadata = $12,
	preferences = $13,
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

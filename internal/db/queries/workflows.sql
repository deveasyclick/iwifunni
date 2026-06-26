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
	true
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


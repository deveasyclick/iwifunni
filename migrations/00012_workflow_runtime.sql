-- +goose Up
ALTER TABLE workflows
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS trigger_event TEXT,
ADD COLUMN IF NOT EXISTS definition_json JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE workflows
SET status = CASE
    WHEN is_active THEN 'active'
    ELSE 'archived'
END
WHERE status = 'draft';

ALTER TABLE workflows
DROP CONSTRAINT IF EXISTS workflows_status_check;

ALTER TABLE workflows
ADD CONSTRAINT workflows_status_check CHECK (status IN ('draft', 'active', 'paused', 'archived'));

CREATE INDEX IF NOT EXISTS idx_workflows_environment_trigger_active
ON workflows(environment_id, trigger_event)
WHERE status = 'active' AND trigger_event IS NOT NULL;

CREATE TABLE IF NOT EXISTS workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    environment_id UUID NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
    subscriber_id UUID REFERENCES subscribers(id) ON DELETE SET NULL,
    status TEXT NOT NULL,
    current_step_id TEXT,
    trigger_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT workflow_executions_status_check CHECK (status IN ('queued', 'running', 'retrying', 'completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_workflow_executions_environment_started
ON workflow_executions(environment_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_started
ON workflow_executions(workflow_id, started_at DESC);

CREATE TABLE IF NOT EXISTS workflow_step_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
    step_id TEXT NOT NULL,
    step_type TEXT NOT NULL,
    status TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    input_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    output_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT workflow_step_executions_status_check CHECK (status IN ('queued', 'running', 'retrying', 'completed', 'failed')),
    CONSTRAINT workflow_step_executions_attempts_check CHECK (attempts >= 0),
    CONSTRAINT workflow_step_executions_execution_step_unique UNIQUE (execution_id, step_id)
);

CREATE INDEX IF NOT EXISTS idx_workflow_step_executions_execution
ON workflow_step_executions(execution_id, created_at ASC);

-- +goose Down
DROP INDEX IF EXISTS idx_workflow_step_executions_execution;
DROP TABLE IF EXISTS workflow_step_executions;

DROP INDEX IF EXISTS idx_workflow_executions_workflow_started;
DROP INDEX IF EXISTS idx_workflow_executions_environment_started;
DROP TABLE IF EXISTS workflow_executions;

DROP INDEX IF EXISTS idx_workflows_environment_trigger_active;
ALTER TABLE workflows DROP CONSTRAINT IF EXISTS workflows_status_check;
ALTER TABLE workflows
DROP COLUMN IF EXISTS definition_json,
DROP COLUMN IF EXISTS trigger_event,
DROP COLUMN IF EXISTS version,
DROP COLUMN IF EXISTS status;
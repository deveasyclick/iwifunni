-- +goose Up
ALTER TABLE workflows DROP CONSTRAINT IF EXISTS workflows_environment_id_key_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_workflows_active_key
  ON workflows (environment_id, key)
  WHERE is_active = true;

-- +goose Down
DROP INDEX IF EXISTS idx_workflows_active_key;

ALTER TABLE workflows ADD CONSTRAINT workflows_environment_id_key_key UNIQUE (environment_id, key);

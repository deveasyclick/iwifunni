-- +goose Up
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    channels TEXT[] NOT NULL DEFAULT '{}'::text[],
    template_ids JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT workflows_project_key_unique UNIQUE (project_id, key)
);

CREATE INDEX idx_workflows_project_id ON workflows(project_id);
CREATE INDEX idx_workflows_project_active ON workflows(project_id, is_active);

-- +goose Down
DROP TABLE IF EXISTS workflows;
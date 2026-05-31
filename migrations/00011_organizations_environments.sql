-- +goose Up
ALTER TABLE projects RENAME TO environments;

-- +goose StatementBegin
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'notifications'
          AND column_name = 'project_id'
    ) THEN
        ALTER TABLE notifications RENAME COLUMN project_id TO environment_id;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'api_keys'
          AND column_name = 'project_id'
    ) THEN
        ALTER TABLE api_keys RENAME COLUMN project_id TO environment_id;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'templates'
          AND column_name = 'project_id'
    ) THEN
        ALTER TABLE templates RENAME COLUMN project_id TO environment_id;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'providers'
          AND column_name = 'project_id'
    ) THEN
        ALTER TABLE providers RENAME COLUMN project_id TO environment_id;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'webhooks'
          AND column_name = 'project_id'
    ) THEN
        ALTER TABLE webhooks RENAME COLUMN project_id TO environment_id;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'subscribers'
          AND column_name = 'project_id'
    ) THEN
        ALTER TABLE subscribers RENAME COLUMN project_id TO environment_id;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'workflows'
          AND column_name = 'project_id'
    ) THEN
        ALTER TABLE workflows RENAME COLUMN project_id TO environment_id;
    END IF;
END
$$;
-- +goose StatementEnd

TRUNCATE TABLE environments CASCADE;
DROP TABLE IF EXISTS project_memberships;

ALTER TABLE environments
ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE environments
ADD COLUMN is_default BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE environments
ADD CONSTRAINT environments_name_check CHECK (name IN ('development', 'production'));

CREATE UNIQUE INDEX idx_environments_organization_name ON environments(organization_id, name);
CREATE UNIQUE INDEX idx_environments_default_per_org ON environments(organization_id) WHERE is_default = true;

-- +goose Down
DROP INDEX IF EXISTS idx_environments_default_per_org;
DROP INDEX IF EXISTS idx_environments_organization_name;

ALTER TABLE environments
DROP CONSTRAINT IF EXISTS environments_name_check;

ALTER TABLE environments
DROP COLUMN IF EXISTS is_default;

ALTER TABLE environments
ALTER COLUMN organization_id DROP NOT NULL;

CREATE TABLE IF NOT EXISTS project_memberships (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT project_memberships_role_check CHECK (role IN ('owner', 'admin', 'member')),
    CONSTRAINT project_memberships_unique_user UNIQUE (project_id, user_id)
);

-- +goose StatementBegin
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'workflows'
          AND column_name = 'environment_id'
    ) THEN
        ALTER TABLE workflows RENAME COLUMN environment_id TO project_id;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'subscribers'
          AND column_name = 'environment_id'
    ) THEN
        ALTER TABLE subscribers RENAME COLUMN environment_id TO project_id;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'webhooks'
          AND column_name = 'environment_id'
    ) THEN
        ALTER TABLE webhooks RENAME COLUMN environment_id TO project_id;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'providers'
          AND column_name = 'environment_id'
    ) THEN
        ALTER TABLE providers RENAME COLUMN environment_id TO project_id;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'templates'
          AND column_name = 'environment_id'
    ) THEN
        ALTER TABLE templates RENAME COLUMN environment_id TO project_id;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'api_keys'
          AND column_name = 'environment_id'
    ) THEN
        ALTER TABLE api_keys RENAME COLUMN environment_id TO project_id;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'notifications'
          AND column_name = 'environment_id'
    ) THEN
        ALTER TABLE notifications RENAME COLUMN environment_id TO project_id;
    END IF;
END
$$;
-- +goose StatementEnd

ALTER TABLE environments RENAME TO projects;
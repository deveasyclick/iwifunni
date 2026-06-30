-- Codeously generated schema (hand-maintained, source of truth for sqlc)
-- Consolidated from all migrations — never deployed to prod, so no legacy.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Core: organizations, users, auth ───────────────────────────

CREATE TABLE organizations (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    first_name TEXT NOT NULL DEFAULT '',
    last_name TEXT NOT NULL DEFAULT '',
    email_verified_at TIMESTAMPTZ,
    onboarding_completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE organization_members (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT organization_members_role_check CHECK (role IN ('owner', 'admin', 'member')),
    CONSTRAINT organization_members_unique_user UNIQUE (organization_id, user_id)
);

CREATE INDEX idx_organization_members_org ON organization_members(organization_id);
CREATE INDEX idx_organization_members_user ON organization_members(user_id);

CREATE TABLE environments (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_environments_organization_name ON environments(organization_id, name);
CREATE UNIQUE INDEX idx_environments_default_per_org ON environments(organization_id) WHERE is_default = true;

CREATE TABLE apikeys (
    id UUID PRIMARY KEY,
    environment_id UUID NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key_prefix TEXT NOT NULL UNIQUE,
    key_hash TEXT NOT NULL,
    scopes JSONB NOT NULL DEFAULT '["notifications:write"]'::jsonb,
    status TEXT NOT NULL DEFAULT 'active',
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    rotated_from UUID REFERENCES apikeys(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_apikeys_environment_id ON apikeys(environment_id);

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);

CREATE TABLE email_verifications (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    code_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_verifications_expires_at ON email_verifications(expires_at);

CREATE TABLE auth_identities (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    provider_user_id TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT auth_identities_provider_check CHECK (provider IN ('google', 'github')),
    CONSTRAINT auth_identities_provider_user_unique UNIQUE (provider, provider_user_id),
    CONSTRAINT auth_identities_user_provider_unique UNIQUE (user_id, provider)
);

CREATE INDEX idx_auth_identities_user_id ON auth_identities(user_id);

-- ── Messaging: notifications, templates, subscribers ───────────

CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    environment_id UUID REFERENCES environments(id),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    channels TEXT[] NOT NULL,
    recipient JSONB NOT NULL,
    metadata JSONB,
    status TEXT NOT NULL,
    job_id TEXT,
    is_test BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_notifications_job_id
ON notifications(job_id)
WHERE job_id IS NOT NULL;

CREATE INDEX idx_notifications_environment_id_is_test
ON notifications(environment_id, is_test);

CREATE TABLE delivery_attempts (
    id UUID PRIMARY KEY,
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    channel TEXT NOT NULL,
    destination TEXT NOT NULL,
    status TEXT NOT NULL,
    error_message TEXT,
    provider_message_id TEXT,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    environment_id UUID NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'push')),
    subject TEXT,
    body TEXT NOT NULL,
    version INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (environment_id, name, channel)
);

CREATE INDEX idx_templates_environment ON templates(environment_id);

CREATE TABLE subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    environment_id UUID NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    push_token TEXT,
    channels TEXT[] NOT NULL DEFAULT '{}'::text[],
    status JSONB NOT NULL DEFAULT '{}'::jsonb,
    tags TEXT[] NOT NULL DEFAULT '{}'::text[],
    preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
    subscription_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_notification_date TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT subscribers_contact_check CHECK (
        email IS NOT NULL OR phone IS NOT NULL OR push_token IS NOT NULL
    )
);

CREATE INDEX idx_subscribers_environment_id ON subscribers(environment_id);
CREATE INDEX idx_subscribers_environment_email ON subscribers(environment_id, email);
CREATE INDEX idx_subscribers_environment_phone ON subscribers(environment_id, phone);
CREATE INDEX idx_subscribers_environment_active ON subscribers(environment_id, deleted_at);
CREATE INDEX idx_subscribers_channels ON subscribers USING GIN(channels);
CREATE INDEX idx_subscribers_tags ON subscribers USING GIN(tags);

-- ── Workflows ──────────────────────────────────────────────────

CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    environment_id UUID NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    channels TEXT[] NOT NULL DEFAULT '{}'::text[],
    template_ids JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    status TEXT NOT NULL DEFAULT 'draft',
    version INTEGER NOT NULL DEFAULT 1,
    trigger_event TEXT,
    definition_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT workflows_status_check CHECK (status IN ('draft', 'active', 'paused', 'archived'))
);

CREATE INDEX idx_workflows_environment_id ON workflows(environment_id);
CREATE INDEX idx_workflows_environment_active ON workflows(environment_id, is_active);
CREATE INDEX idx_workflows_environment_trigger_active
ON workflows(environment_id, trigger_event)
WHERE status = 'active' AND trigger_event IS NOT NULL;

CREATE UNIQUE INDEX idx_workflows_active_key
ON workflows (environment_id, key)
WHERE is_active = true;

CREATE TABLE workflow_executions (
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

CREATE INDEX idx_workflow_executions_environment_started
ON workflow_executions(environment_id, started_at DESC);

CREATE INDEX idx_workflow_executions_workflow_started
ON workflow_executions(workflow_id, started_at DESC);

CREATE TABLE workflow_step_executions (
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

CREATE INDEX idx_workflow_step_executions_execution
ON workflow_step_executions(execution_id, created_at ASC);

-- ── Integrations (notification delivery providers) ─────────────

CREATE TABLE integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    environment_id UUID NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    channel TEXT NOT NULL,
    credentials JSONB NOT NULL,
    config JSONB,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (environment_id, name),
    CONSTRAINT integrations_primary_requires_active CHECK (NOT is_primary OR is_active)
);

CREATE INDEX idx_integrations_environment ON integrations(environment_id);

CREATE UNIQUE INDEX idx_integrations_primary_per_channel
ON integrations(environment_id, channel)
WHERE is_primary = true;

-- ── Webhooks ───────────────────────────────────────────────────

CREATE TABLE webhooks (
    id UUID PRIMARY KEY,
    environment_id UUID NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    secret TEXT NOT NULL,
    events TEXT[] NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE webhook_deliveries (
    id UUID PRIMARY KEY,
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL,
    response_code INT,
    error_message TEXT,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

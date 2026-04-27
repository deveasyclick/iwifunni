
# 🧱 DATABASE SCHEMA DESIGN (POSTGRES)

---

# 🏢 1. ORGANIZATION LAYER (MULTI-TENANCY ROOT)

## organizations

```sql id="org1"
CREATE TABLE organizations (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);
```

---

## organization_members

```sql id="org2"
CREATE TABLE organization_members (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,

    role TEXT NOT NULL DEFAULT 'member', -- owner | admin | member

    created_at TIMESTAMP NOT NULL DEFAULT now()
);
```

---

# 📁 2. PROJECT LAYER (ISOLATION UNIT)

Each organization can have multiple projects.

## projects

```sql id="proj1"
CREATE TABLE projects (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    name TEXT NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);
```

---

# 🔐 3. AUTH LAYER (API KEYS)

## api_keys

```sql id="key1"
CREATE TABLE api_keys (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    name TEXT NOT NULL,

    key_prefix TEXT NOT NULL,      -- nk_live_ab12
    key_hash TEXT NOT NULL,        -- bcrypt hash of full key

    scopes JSONB NOT NULL DEFAULT '["notifications:write"]',

    status TEXT NOT NULL DEFAULT 'active', 
    -- active | revoked | expired | rotating

    last_used_at TIMESTAMP,

    expires_at TIMESTAMP,
    revoked_at TIMESTAMP,

    rotated_from UUID REFERENCES api_keys(id),

    created_at TIMESTAMP NOT NULL DEFAULT now()
);
```

---

## indexes

```sql id="key2"
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_project ON api_keys(project_id);
```

---

# 🔌 4. PROVIDER SYSTEM (SENDGRID / TWILIO / ETC)

---

## providers

Stores per-project provider configuration.

```sql id="prov1"
CREATE TABLE providers (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    name TEXT NOT NULL,  
    -- sendgrid | twilio | ses | etc

    channel TEXT NOT NULL, 
    -- email | sms | push

    credentials JSONB NOT NULL, -- encrypted at app layer

    config JSONB,

    is_active BOOLEAN NOT NULL DEFAULT true,

    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);
```

---

## provider_health (optional but recommended)

```sql id="prov2"
CREATE TABLE provider_health (
    id UUID PRIMARY KEY,
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,

    status TEXT NOT NULL,
    -- healthy | degraded | down

    failure_count INT NOT NULL DEFAULT 0,

    last_checked_at TIMESTAMP
);
```

---

# 🧠 5. NOTIFICATION CORE SYSTEM

---

## notifications

This is your central table.

```sql id="notif1"
CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    channel TEXT NOT NULL, 
    -- email | sms | push

    template_id UUID,

    recipient JSONB NOT NULL, 
    -- { email, phone, device_token }

    payload JSONB, -- variables used in template

    status TEXT NOT NULL DEFAULT 'queued',
    -- queued | processing | sent | failed | delivered

    provider_used TEXT,

    idempotency_key TEXT,

    metadata JSONB,

    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);
```

---

## indexes

```sql id="notif2"
CREATE INDEX idx_notifications_project ON notifications(project_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_idempotency ON notifications(idempotency_key);
```

---

## notification_events (timeline tracking)

```sql id="notif3"
CREATE TABLE notification_events (
    id UUID PRIMARY KEY,
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,

    event TEXT NOT NULL,
    -- queued | sent | delivered | failed | opened | clicked

    provider TEXT,

    metadata JSONB,

    created_at TIMESTAMP NOT NULL DEFAULT now()
);
```

---

# 🧾 6. TEMPLATE SYSTEM

---

## templates

```sql id="tpl1"
CREATE TABLE templates (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    name TEXT NOT NULL,
    channel TEXT NOT NULL,

    subject TEXT,
    body TEXT NOT NULL,

    version INT NOT NULL DEFAULT 1,

    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);
```

---

## template_versions (optional but powerful)

```sql id="tpl2"
CREATE TABLE template_versions (
    id UUID PRIMARY KEY,
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,

    version INT NOT NULL,
    subject TEXT,
    body TEXT NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT now()
);
```

---

# 🌐 7. WEBHOOK SYSTEM

---

## webhooks

```sql id="wh1"
CREATE TABLE webhooks (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    url TEXT NOT NULL,

    secret TEXT NOT NULL,

    events JSONB NOT NULL,
    -- ["notification.sent", "notification.failed"]

    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMP NOT NULL DEFAULT now()
);
```

---

## webhook_deliveries

```sql id="wh2"
CREATE TABLE webhook_deliveries (
    id UUID PRIMARY KEY,
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,

    event TEXT NOT NULL,

    payload JSONB NOT NULL,

    status TEXT NOT NULL,
    -- success | failed | retrying

    response_code INT,
    response_body TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT now()
);
```

---

# 🚦 8. RATE LIMITING (OPTIONAL DB FALLBACK)

(You’ll likely use Redis, but DB fallback is useful)

```sql id="rl1"
CREATE TABLE rate_limits (
    id UUID PRIMARY KEY,
    api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,

    window_start TIMESTAMP NOT NULL,
    request_count INT NOT NULL DEFAULT 0
);
```

---

# 🔁 9. IDENTITY FLOW (HOW EVERYTHING CONNECTS)

```text id="flow1"
Organization
   ↓
Project
   ↓
API Key → Auth layer
   ↓
Provider config (SendGrid / Twilio)
   ↓
Notification table
   ↓
Worker processing
   ↓
Provider registry execution
   ↓
Events + Webhooks
```

---

# 🧠 10. DESIGN RULES (VERY IMPORTANT)

## 1. EVERYTHING is project-scoped

```text id="rule1"
NO table exists without project_id (except org/users)
```

---

## 2. Credentials NEVER stored raw

```text id="rule2"
providers.credentials = encrypted JSONB
```

---

## 3. Notifications are immutable logs

```text id="rule3"
status changes only via events table
```

---

## 4. Provider is NOT hardcoded

```text id="rule4"
DB → registry → execution
```

---

## 5. API keys are hashed

```text id="rule5"
never store raw key after creation
```
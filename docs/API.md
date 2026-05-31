# Notification System API Specification

Version: v1  
Base URL: https://api.yourdomain.com/v1

---

# Overview

This API powers a multi-tenant notification system supporting:

- Email
- SMS
- Push
- Multi-provider routing
- Subscribers
- Workflows
- Templates
- Delivery tracking
- Webhooks

Current implementation baseline: [current-v1-contract.md](./current-v1-contract.md). If this file and the baseline disagree, treat the baseline and current code as the active behavior.

---

# Authentication

The API currently supports two primary authentication methods and one legacy compatibility path:

---

## 1. API Key Authentication (SDK / Server-to-Server)

Used for sending notifications.

### Header
```

Authorization: Bearer nk_live_xxx

```

### Behavior
- API key resolves `project_id`
- All requests are scoped to a project
- Used for `/notifications`, `/templates`, `/providers`, `/webhooks`, `/subscribers`, and `/workflows`

---

## 2. JWT Authentication (Dashboard)

Used for user actions (UI only).

### Header
```

Authorization: Bearer <jwt_token>

```

### Contains:
- user_id
- project_id
- role

---

## 3. Legacy Service-Key Authentication (Compatibility Path)

This path is still active in code for older service-scoped sends.

### Header
```

Authorization: ApiKey <service_api_key>

```

### Behavior
- Resolves legacy service context
- Rate limits by service ID
- Only use this path when working with legacy compatibility behavior

---

# API KEY MANAGEMENT

---

## Create API Key

```

POST /api-keys

````

### Auth
JWT required

### Request
```json id="ak1"
{
  "name": "Production Key",
  "scopes": [
    "notifications:write"
  ]
}
````

### Response

```json id="ak2"
{
  "id": "uuid",
  "name": "Production Key",
  "key_prefix": "nk_live_xxxxxxxx",
  "scopes": ["notifications:write"],
  "status": "active",
  "created_at": "2026-04-26T10:00:00Z",
  "key": "nk_live_8f3Kx91AbcQz"
}
```

---

## List API Keys

```
GET /api-keys
```

### Response

```json id="ak3"
[
  {
    "id": "uuid",
    "name": "Production Key",
    "key_prefix": "nk_live_xxxxxxxx",
    "scopes": ["notifications:write"],
    "status": "active",
    "created_at": "2026-04-26T10:00:00Z"
  }
]
```

---

## Rotate API Key

```
POST /api-keys/{id}/rotate
```

### Response

```json id="ak4"
{
  "id": "uuid",
  "name": "Production Key",
  "key_prefix": "nk_live_xxxxxxxx",
  "scopes": ["notifications:write"],
  "status": "active",
  "created_at": "2026-04-26T10:00:00Z",
  "key": "nk_live_new123"
}
```

---

## Revoke API Key

```
DELETE /api-keys/{id}
```

### Response

`204 No Content`

---

## Update API Key Status

```
PATCH /api-keys/{id}
```

### Request

```json
{
  "status": "disabled"
}
```

### Supported values

- `active`
- `disabled`

---

# PROVIDERS

---

## Connect Provider

```
POST /providers
```

### Auth

Project API key required. The legacy `Authorization: ApiKey <service_api_key>` path also remains active in code.

### Request (SendGrid example)

SendGrid

```json id="p1"
{
  "name": "sendgrid",
  "channel": "email",
  "credentials": {
    "api_key": "SG.xxxxx"
  },
  "config": {
    "from_email": "no-reply@yourapp.com",
    "from_name": "MyApp"
  }
}
```

---

### Request (Twilio example)

Twilio

```json id="p2"
{
  "name": "twilio",
  "channel": "sms",
  "credentials": {
    "account_sid": "ACxxx",
    "auth_token": "xxx",
    "from_number": "+123456789"
  }
}
```

---

### Response

```json id="p3"
{
  "id": "uuid",
  "project_id": "uuid",
  "name": "sendgrid",
  "channel": "email",
  "is_active": true,
  "created_at": "2026-04-26T10:00:00Z"
}
```

---

## List Providers

```
GET /providers
```

### Response

```json id="p4"
[
  {
    "id": "uuid",
    "name": "sendgrid",
    "channel": "email",
    "is_active": true,
    "created_at": "2026-04-26T10:00:00Z"
  }
]
```

---

## Delete Provider

```
DELETE /providers/{id}
```

---

# SUBSCRIBERS

---

## Create Subscriber

```
POST /subscribers
```

### Auth

Project API key or JWT required.

### Request

```json
{
  "name": "Ada Nwosu",
  "email": "ada@example.com",
  "channels": ["email"],
  "status": {
    "email": "subscribed"
  },
  "tags": ["vip"]
}
```

### Current Rules

- At least one channel is required.
- Each selected channel must have a matching contact field.
- Supported channel values are `email`, `sms`, and `push`.

## List Subscribers

```
GET /subscribers
```

## Update Subscriber

```
PUT /subscribers/{id}
```

## Delete Subscriber

```
DELETE /subscribers/{id}
```

---

# WORKFLOWS

---

## Create Workflow

```
POST /workflows
```

### Auth

Project API key or JWT required.

### Request

```json
{
  "key": "user_onboarding",
  "name": "User Onboarding",
  "description": "Welcome sequence for new users",
  "channels": ["email", "sms"],
  "templateIds": {
    "email": "template-uuid"
  }
}
```

### Current Rules

- Workflows are project-scoped configuration records.
- They currently store channel order and optional template linkage.
- They do not yet change the active `POST /notifications` send contract.

## List Workflows

```
GET /workflows
```

## Update Workflow

```
PUT /workflows/{id}
```

## Delete Workflow

```
DELETE /workflows/{id}
```

---

# NOTIFICATIONS

---

## Send Notification

```
POST /notifications
```

### Auth

API Key required

---

### Request

```json id="n1"
{
  "title": "Welcome",
  "message": "Thanks for joining",
  "channels": ["email"],
  "recipient": {
    "email": "john@example.com",
    "reference": "customer-123"
  },
  "metadata": {
    "source": "signup"
  }
}
```

### Current Rules

- Current v1 accepts either:
  - direct `title`, `message`, `channels`, `recipient`, and optional `metadata`
  - or `workflow_id`, `subscriber_id`, `title`, `message`, and optional `metadata`
- `recipient` may include `email`, `phone_number`, `push_tokens`, and `reference`.
- Workflow-targeted sends resolve channels from the workflow record, recipient data from the subscriber record, and rendered per-channel content from linked templates.
- Workflow channels without linked templates, required contact data, or active subscriber consent are skipped instead of failing the whole send.
- Workflow-targeted sends require project API key auth and are not supported through the legacy `Authorization: ApiKey <service_api_key>` path.
- The endpoint resolves either project API key context or legacy service context and enqueues the job.

### Workflow-targeted request example

```json
{
  "workflow_id": "uuid",
  "subscriber_id": "uuid",
  "title": "Welcome",
  "message": "Thanks for joining",
  "metadata": {
    "source": "signup"
  }
}
```

---

### Response

```json id="n2"
{
  "status": "queued"
}
```

---

## Notification Read Endpoints

These routes currently exist for dashboard JWT traffic:

```
GET /notifications
GET /notifications/{id}
```

They expose project-scoped notification history and detail records for the authenticated dashboard project.

---

# TEMPLATES

---

## Create Template

```
POST /templates
```

### Auth

Project API key required. The legacy `Authorization: ApiKey <service_api_key>` path also remains active in code.

### Request

```json id="t1"
{
  "name": "OTP Email",
  "channel": "email",
  "subject": "Your OTP Code",
  "body": "Hello {{name}}, your OTP is {{code}}"
}
```

---

## List Templates

```
GET /templates
```

---

## Get Template

```
GET /templates/{id}
```

---

## Update Template

```
PATCH /templates/{id}
```

---

## Delete Template

```
DELETE /templates/{id}
```

---

## Render Template

```
POST /templates/render
```

---

# WEBHOOKS

---

## Register Webhook

```
POST /webhooks
```

### Auth

Project API key required. The legacy `Authorization: ApiKey <service_api_key>` path also remains active in code.

### Request

```json id="w1"
{
  "url": "https://example.com/webhook",
  "events": [
    "notification.sent",
    "notification.failed"
  ],
  "secret": "whsec_xxx"
}
```

---

## Webhook Events

### notification.sent

```json id="w2"
{
  "event": "notification.sent",
  "notification_id": "notif_123",
  "project_id": "proj_123"
}
```

---

### notification.failed

```json id="w3"
{
  "event": "notification.failed",
  "notification_id": "uuid",
  "project_id": "uuid",
  "timestamp": "2026-04-27T12:00:00Z"
}
```

---

# RATE LIMITING

Applied per API key:

* 100 req/sec default
* 10,000 req/day default

Headers returned:

```
X-RateLimit-Limit
X-RateLimit-Remaining
X-RateLimit-Reset
```

---

# ERROR FORMAT

```json id="e1"
{
  "error": {
    "code": "INVALID_API_KEY",
    "message": "API key is invalid or expired"
  }
}
```

---

# STATUS CODES

* 200 OK
* 201 Created
* 400 Bad Request
* 401 Unauthorized
* 403 Forbidden
* 429 Rate Limited
* 500 Server Error

---

# SECURITY NOTES

* API keys are hashed (never stored in plaintext)
* Provider credentials are encrypted at rest
* Webhooks are HMAC signed
* All requests are scoped by project_id
* Multi-tenant isolation is enforced at every layer

---

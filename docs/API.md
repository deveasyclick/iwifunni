# Notification System API Specification

Version: v1  
Base URL: https://api.yourdomain.com/v1

---

# Overview

This API powers a multi-tenant notification system supporting:

- Email
- SMS
- Push (future)
- Multi-provider routing
- Templates
- Delivery tracking
- Webhooks

---

# Authentication

The API supports two authentication methods:

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
- Required for all `/notifications` endpoints

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
  "expires_in_days": 365,
  "scopes": [
    "notifications:write",
    "templates:read"
  ]
}
````

### Response

```json id="ak2"
{
  "id": "key_id",
  "api_key": "nk_live_8f3Kx91AbcQz",
  "status": "active"
}
```

---

## List API Keys

```
GET /api-keys
```

### Response

```json id="ak3"
{
  "keys": [
    {
      "id": "key_id",
      "name": "Production Key",
      "status": "active",
      "last_used_at": "2026-04-26T10:00:00Z"
    }
  ]
}
```

---

## Rotate API Key

```
POST /api-keys/{id}/rotate
```

### Response

```json id="ak4"
{
  "new_api_key": "nk_live_new123",
  "old_key_expires_at": "2026-05-03T00:00:00Z"
}
```

---

## Revoke API Key

```
DELETE /api-keys/{id}
```

### Response

```json id="ak5"
{
  "status": "revoked"
}
```

---

# PROVIDERS

---

## Connect Provider

```
POST /providers
```

### Auth

JWT required

### Request (SendGrid example)

SendGrid

```json id="p1"
{
  "provider": "sendgrid",
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
  "provider": "twilio",
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
  "id": "provider_id",
  "status": "connected"
}
```

---

## List Providers

```
GET /providers
```

### Response

```json id="p4"
{
  "providers": [
    {
      "id": "provider_id",
      "provider": "sendgrid",
      "channel": "email",
      "status": "active"
    }
  ]
}
```

---

## Delete Provider

```
DELETE /providers/{id}
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
  "to": {
    "email": "user@example.com",
    "phone": "+2348000000000"
  },
  "channel": "email",
  "template_id": "tpl_123",
  "variables": {
    "name": "John",
    "code": "123456"
  },
  "metadata": {
    "source": "signup"
  }
}
```

---

### Response

```json id="n2"
{
  "notification_id": "notif_123",
  "status": "queued"
}
```

---

## Get Notification Status

```
GET /notifications/{id}
```

### Response

```json id="n3"
{
  "id": "notif_123",
  "status": "sent",
  "provider": "sendgrid",
  "timeline": [
    { "status": "queued", "timestamp": "..." },
    { "status": "sent", "timestamp": "..." }
  ]
}
```

---

## List Notifications

```
GET /notifications
```

### Query params

* status
* channel
* limit
* cursor

---

# TEMPLATES

---

## Create Template

```
POST /templates
```

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

## Update Template (versioned)

```
PUT /templates/{id}
```

---

# WEBHOOKS

---

## Register Webhook

```
POST /webhooks
```

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
  "reason": "provider_error"
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

# Notification System Architecture

## Overview

This project is a multi-tenant, API-driven notification system that supports:

- Email notifications
- SMS notifications
- Push notifications (future)
- Multi-provider routing (e.g. SendGrid, Twilio)
- Template-based messaging
- Delivery tracking and webhooks

The system is designed for high scalability, extensibility, and strong tenant isolation.

---

## Core Design Principles

### 1. Multi-Tenancy
Every request is scoped by `project_id`.

- All resources (providers, templates, notifications) belong to a project
- API keys are the primary mechanism for resolving project context

---

### 2. Separation of Auth Concerns

We use two authentication systems:

#### API Keys (Machine-to-Machine)

- Used by SDKs and backend services
- Scoped to a project
- Used for sending notifications

#### JWT (User Authentication)
- Used for dashboard access
- Represents human users
- Used for managing settings, providers, templates

---

### 3. Provider Abstraction (Plugin System)

All external delivery providers are abstracted via a unified interface.

Examples:
- SendGrid (Email)
- Twilio (SMS)

Providers are not called directly from business logic. Instead, they are resolved via a **Registry**.

---

### 4. Provider Registry Pattern

The registry maps provider names to concrete implementations.

Example:
- "sendgrid" → SendGridProvider
- "twilio" → TwilioProvider

This allows:
- Extensibility (add providers without changing core logic)
- Decoupling business logic from vendor APIs

---

### 5. Queue-Based Processing

All notifications are processed asynchronously.

Flow:
- API request → validation → enqueue job
- Worker consumes job → sends notification
- Status updated asynchronously

---

## High-Level System Flow

### 1. Sending a Notification

```bash
Client (SDK/API)
↓
API Key Middleware
↓
Resolve project_id
↓
Validate request
↓
Push to Queue
↓
Worker picks job
↓
Load provider config (DB)
↓
Resolve provider via Registry
↓
Send notification
↓
Store delivery status
↓
Trigger webhook (optional)

```

---

### 2. Provider Connection Flow

```bash
User (Dashboard)
↓
JWT Auth Middleware
↓
Select provider (SendGrid / Twilio)
↓
Submit credentials
↓
Validate credentials with provider API
↓
Encrypt credentials
↓
Store in DB under project_id
```

---

## Authentication Architecture

### API Key Authentication Flow

1. Extract API key from request header
2. Lookup key in database by prefix
3. Validate bcrypt hash
4. Check status (active / revoked / expired)
5. Attach `project_id` to request context

### JWT Authentication Flow

1. User logs into dashboard
2. Server validates credentials
3. Issues JWT containing:
   - user_id
   - project_id
   - role
4. Middleware validates token on each request

---

## API Key Lifecycle

### States

- ACTIVE → usable
- ROTATING → still valid, scheduled for deprecation
- EXPIRED → no longer valid
- REVOKED → manually disabled

### Rotation Flow

1. Generate new API key
2. Store new key as ACTIVE
3. Mark old key as ROTATING
4. Allow grace period (e.g. 7 days)
5. Expire old key automatically

---

## Provider System

### Provider Interface

All providers implement:

```go
type Provider interface {
	Name() string
	Channel() string
	Send(message Message, credentials map[string]string) (Result, error)
}
````

---

### Registry

The registry is responsible for:

* Mapping provider names → implementations
* Providing runtime resolution of providers
* Ensuring decoupling between business logic and external APIs

---

## Notification Delivery System

### Key Concepts

* Notifications are immutable once created
* Delivery is asynchronous
* Each notification has a lifecycle:

  * queued
  * processing
  * sent
  * delivered
  * failed

---

## Webhooks System

Events emitted:

* notification.sent
* notification.failed
* notification.delivered
* notification.opened (email)
* notification.clicked (optional)

Webhooks are signed using HMAC for verification.

---

## Rate Limiting

Rate limits are enforced per API key:

* Requests per second
* Requests per day

Implementation uses Redis-based counters.

---

## Security Model

* API keys are hashed (never stored in plaintext)
* Provider credentials are encrypted at rest
* All requests are scoped by project_id
* Webhook payloads are signed
* Sensitive logs are redacted

---

## Extensibility Goals

The system is designed to easily support:

* New providers (via registry)
* New channels (push, WhatsApp, etc.)
* New routing strategies (cost-based, latency-based)
* Event streaming pipelines

---

## Directory Mapping (Go)

```bash
/internal
  /auth          → JWT + API key auth
  /provider      → provider implementations
  /registry      → provider registry system
  /worker        → queue consumers
  /middleware    → HTTP middleware
  /notification  → core domain logic
```

---

## Summary

This system is designed to behave like a modern notification infrastructure platform:

* API-key driven for machines
* JWT-driven for users
* Registry-based provider abstraction
* Queue-based async processing
* Multi-tenant isolation via project_id
* Fully extensible provider system


## Folder Structure

```bash
.
├── cmd/
│   └── api/
│       └── main.go
│   └── worker/
│       └── main.go

├── internal/

│   ├── app/
│   │   ├── app.go              # dependency wiring (NEW)

│   ├── auth/
│   │   ├── api_key.go
│   │   ├── jwt.go
│   │   ├── middleware.go
│   │   ├── rate_limiter.go

│   ├── organization/
│   │   ├── handler.go
│   │   ├── service.go
│   │   ├── repository.go

│   ├── project/
│   │   ├── handler.go
│   │   ├── service.go
│   │   ├── repository.go

│   ├── api_key/
│   │   ├── handler.go
│   │   ├── service.go
│   │   ├── repository.go

│   ├── provider/
│   │   ├── handler.go
│   │   ├── service.go
│   │   ├── repository.go
│   │   ├── models.go

│   ├── registry/
│   │   ├── registry.go         # plugin system (SendGrid/Twilio)

│   ├── notification/
│   │   ├── handler.go
│   │   ├── service.go
│   │   ├── repository.go
│   │   ├── dispatcher.go       # NEW (core logic)
│   │   ├── worker.go

│   ├── templates/
│   │   ├── handler.go
│   │   ├── service.go
│   │   ├── repository.go

│   ├── webhooks/
│   │   ├── handler.go
│   │   ├── service.go
│   │   ├── dispatcher.go

│   ├── queue/
│   │   ├── asyncq.go          # wrapper around go-asyncq

│   ├── channels/
│   │   ├── email.go
│   │   ├── sms.go
│   │   ├── push.go

│   ├── worker/
│   │   ├── consumer.go        # asyncq worker loop
│   │   ├── jobs.go

│   ├── db/
│   │   ├── sqlc/
│   │   │   ├── queries/
│   │   │   ├── schema/
│   │   │   └── db.go

│   ├── config/
│   ├── logger/
│   ├── types/
│   └── utils/

├── migrations/
├── docs/
├── pkg/
└── sqlc.yaml
└── Taskfile.yml
└── .tool-versions
└── docker-compose.yml
└── README.md
└── go.mod
└── go.sum
└── .gitignore
└── .air.toml
```
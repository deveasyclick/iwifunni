# Iwifunni Notification Platform

A multi-tenant, API-driven notification platform in Go. It lets you send email, SMS, and push notifications through a single REST API, processed asynchronously via a Redis-backed queue.

Key features:

- Multi-tenant project model — every resource is scoped  
  to a project
- Dual auth — API keys for machine-to-machine, JWT for  
  dashboard users
- Pluggable providers — SendGrid, SMTP, Termii, FCM, Web
  Push, and more
- Workflow engine — define multi-channel notification  
  flows with templates, delays, and subscriber  
  preferences
- Template management — store and render notification  
  templates per project
- Subscriber management — store contacts, channel  
  preferences, and tags
- Webhook delivery — subscribe to notification.sent /  
  notification.failed events
- Dashboard — Next.js-based management UI for all  
  resources
- Built with Go (backend) + Next.js (frontend)

## Supported Delivery Channels

- Email (SMTP / SendGrid)
- SMS (Termii)
- Push (FCM / Web Push)

## Authentication

Legacy compatibility mode: `Authorization: ApiKey <service_key>` is still active in code for older service-scoped sends.

## Architecture at a Glance

```
Client (SDK / API)
  ↓
API Key or JWT Middleware  →  resolve project or user context
  ↓
Validate request
  ↓
Enqueue job (Asynq / Redis)
  ↓
Worker picks job
  ↓
Load provider config from DB
  ↓
Deliver via channel provider (Email / SMS / Push)
  ↓
Update notification status (sent / partial_failed / failed)
  ↓
Fire webhooks for emitted events
```

## Features

- Multi-tenant project model — every resource is scoped to a project
- Dual auth: API keys for SDK/backend, JWT for dashboard users
- Project-scoped provider registry — configure different email/SMS/push providers per project
- Template management — store and render Go text/template notification templates per project
- Subscriber management — store project-scoped subscriber contacts, channel status, and tags
- Workflow management — store workflow keys, channel order, and optional template mappings per project
- API key management — create, rotate, and revoke project API keys
- Webhook delivery — register endpoints to receive `notification.sent` / `notification.failed` events with HMAC-SHA256 signatures
- Asynchronous processing via Redis-backed Asynq workers
- Per-project rate limiting
- AES-GCM encryption for provider credentials at rest

Current v1 implementation baseline: [docs/current-v1-contract.md](docs/current-v1-contract.md)

## Delivery Flow

1. Client sends `POST /notifications` with either `Authorization: Bearer nk_live_<key>` or the legacy `Authorization: ApiKey <service_key>` format.
2. Middleware resolves project or service context and enforces rate limits.
3. Request includes either direct notification fields (`title`, `message`, `channels`, `recipient`) or workflow-targeted fields (`workflow_id`, `subscriber_id`, `title`, `message`) plus optional `metadata`.
4. The API enqueues the notification job and returns immediately.
5. Workflow-targeted sends resolve channels from the workflow record, render linked templates per channel, and skip unsubscribed, bounced, or unmapped channels.
6. The worker persists the notification, resolves an active provider by channel, and attempts delivery through the provider registry.
7. Notification status is updated to `sent`, `partial_failed`, `failed`, `partial_skipped`, or `skipped`.
8. Webhooks subscribed to `notification.sent` or `notification.failed` are dispatched asynchronously when configured.

## Getting Started

### Prerequisites

- Go 1.26+
- PostgreSQL
- Redis
- goose CLI (`go install github.com/pressly/goose/v3/cmd/goose@latest`)
- sqlc CLI (`go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest`)
- Taskfile (`https://taskfile.dev/docs/installation`)

### Environment

Copy `.env.example` to `.env` and set the required values:

```
DATABASE_URL=postgres://...
REDIS_ADDR=localhost:6379
JWT_SECRET=<random-256-bit-hex>
ENCRYPTION_KEY=<random-32-byte-hex>
API_PORT=8080
```

### Run Migrations

```bash
goose -dir migrations postgres "$DATABASE_URL" up
```

### Run the Service

```bash
task server
```

### Run the Worker

```bash
task worker
```

### Run the Frontend

```bash
task web
```

### Docker Compose

```bash
docker compose up --build
```

## API Reference

Interactive API documentation is available at [http://localhost:8080/swagger/index.html](http://localhost:8080/swagger/index.html) when the server is running.

## Development

### Generate SQL Code

```bash
sqlc generate
```

### Run Tests

```bash
go test ./...
```


## Project Structure

- `cmd/api`: HTTP API entrypoint
- `cmd/worker`: background worker entrypoint
- `internal/app`: HTTP router wiring and auth handler adapter
- `internal/auth`: JWT, project API key, legacy service-key auth, and rate limiting
- `internal/notification`: notification handlers, service orchestration, repository, and worker integration
- `internal/provider`: project-scoped provider management and secret encryption
- `internal/templates`: project-scoped template management and rendering
- `internal/webhooks`: outbound webhook management and dispatch
- `internal/storage`: PostgreSQL store bootstrap
- `internal/db/queries`: sqlc query definitions
- `migrations`: goose migration files

# Iwifunni Notification Platform

A multi-tenant, API-driven notification platform in Go.

Iwifunni lets your backend services and dashboard clients work with project-scoped notifications, subscribers, workflows, providers, templates, API keys, and webhooks through a single backend. Notifications are processed asynchronously through a Redis-backed queue and delivered through pluggable channel providers. The active send contract now supports both direct sends and workflow-targeted sends, including workflow-linked template rendering and skip-aware subscriber delivery.

## Supported Delivery Channels

- Email (SMTP / SendGrid)
- SMS (Termii)
- Push (FCM / Web Push)

## Authentication

Iwifunni currently uses two primary auth systems plus one legacy compatibility path:

| Mechanism | Format | Purpose |
|-----------|--------|---------|
| API Key | `Bearer nk_live_<token>` | Machine-to-machine — sending notifications and managing resources |
| JWT | `Bearer <jwt>` | Dashboard users — signup, signin, managing project settings |

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

### Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/signup` | Create account and project |
| POST | `/auth/signin` | Signin, receive JWT + refresh token |
| POST | `/auth/refresh` | Exchange refresh token for new access token |
| POST | `/auth/logout` | Revoke refresh token |

### Notifications

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/notifications` | API Key | Enqueue a notification |

**Example request:**
```json
{
  "title": "Welcome",
  "message": "Thanks for joining",
  "channels": ["email"],
  "recipient": {
    "email": "user@example.com",
    "reference": "customer-123"
  },
  "metadata": {
    "source": "signup"
  }
}
```

Rules:
- Current v1 accepts either:
  - direct `title`, `message`, `channels`, `recipient`, and optional `metadata`
  - or `workflow_id`, `subscriber_id`, `title`, `message`, and optional `metadata`
- Workflow-targeted sends resolve channels from the workflow record, recipient data from the subscriber record, and rendered per-channel content from linked templates.
- Workflow channels without linked templates, required contact data, or active subscriber consent are skipped instead of failing the whole send.
- Workflow-targeted sends require project-scoped auth and are not supported through the legacy `Authorization: ApiKey <service_key>` path.
- `recipient` can include `email`, `phone_number`, `push_tokens`, and `reference`.
- The endpoint returns `202 Accepted` when the job is enqueued successfully.

### Subscribers

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/subscribers` | API Key or JWT | Create a subscriber |
| GET | `/subscribers` | API Key or JWT | List subscribers |
| GET | `/subscribers/{subscriberID}` | API Key or JWT | Get a subscriber |
| PUT | `/subscribers/{subscriberID}` | API Key or JWT | Update a subscriber |
| DELETE | `/subscribers/{subscriberID}` | API Key or JWT | Delete a subscriber |

### Workflows

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/workflows` | API Key or JWT | Create a workflow |
| GET | `/workflows` | API Key or JWT | List workflows |
| GET | `/workflows/{workflowID}` | API Key or JWT | Get a workflow |
| PUT | `/workflows/{workflowID}` | API Key or JWT | Update a workflow |
| DELETE | `/workflows/{workflowID}` | API Key or JWT | Archive a workflow |

### Templates

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/templates` | API Key | Create a template |
| GET | `/templates` | API Key | List templates |
| GET | `/templates/{templateID}` | API Key | Get a template |
| PATCH | `/templates/{templateID}` | API Key | Update a template |
| DELETE | `/templates/{templateID}` | API Key | Delete a template |
| POST | `/templates/render` | API Key | Render a template with variables |

### Providers

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/providers` | API Key | Register a channel provider |
| GET | `/providers` | API Key | List providers |
| GET | `/providers/{providerID}` | API Key | Get a provider |
| PUT | `/providers/{providerID}` | API Key | Update a provider |
| DELETE | `/providers/{providerID}` | API Key | Delete a provider |

Provider `credentials` are encrypted with AES-GCM before storage.

### API Keys

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api-keys` | JWT | List API keys for the project |
| POST | `/api-keys` | JWT | Create a new API key |
| POST | `/api-keys/{keyID}/rotate` | JWT | Rotate (regenerate) an API key |
| DELETE | `/api-keys/{keyID}` | JWT | Revoke an API key |
| PATCH | `/api-keys/{keyID}` | JWT | Update API key status |

API keys are in the format `nk_live_<token>`. Only the prefix is stored; the full key is shown once on creation.

### Webhooks

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/webhooks` | API Key | Register a webhook endpoint |
| GET | `/webhooks` | API Key | List webhooks |
| DELETE | `/webhooks/{webhookID}` | API Key | Deactivate a webhook |

**Webhook events:** `notification.sent`, `notification.failed`

Deliveries include an `X-Signature-256: sha256=<hex>` header. Verify it with HMAC-SHA256 using your webhook secret.

**Example payload:**
```json
{
  "event": "notification.sent",
  "notification_id": "uuid",
  "project_id": "uuid",
  "timestamp": "2026-04-27T12:00:00Z"
}
```

## Development

### Generate SQL Code

```bash
sqlc generate
```

### Run Tests

```bash
go test ./...
```


### Example REST Request

```bash
curl -X POST http://localhost:8080/notifications \
  -H "Authorization: Bearer YOUR_PROJECT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title":"Hello","message":"Welcome","channels":["email"],"recipient":{"email":"user@example.com","reference":"user-123"},"metadata":{"source":"manual-test"}}'
```

## Manual Testing

Use this flow to test the currently implemented project-scoped contract. This flow avoids the older service-key bootstrap path and uses the auth and notification behavior that exists in code today.

### 1. Start Postgres and Redis

```bash
docker compose up -d
```

### 2. Configure local environment values

Copy `.env.example` to `.env` and update the database and Redis ports to match `docker-compose.yml`:

```env
DATABASE_URL=postgres://yusuf:123456@localhost:5435/iwifunni?sslmode=disable
REDIS_ADDR=localhost:6380
REDIS_PASSWORD=
API_PORT=8080
RATE_LIMIT_PER_MINUTE=60
ENVIRONMENT=development
JWT_SECRET=development-jwt-secret-change-me
ENCRYPTION_KEY=dev-encryption-key-32bytes-padded
```

### 3. Run the API server and worker

```bash
task server
```

In another terminal:

```bash
task worker
```

### 4. Sign up and capture the returned tokens

```bash
curl -i -X POST http://localhost:8080/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@example.com","password":"supersecret","project_name":"Manual Test Project","api_key_name":"Manual Test Key"}'
```

Capture the returned:

- `access_token`
- `refresh_token`
- `api_key`

### 5. Create a provider with the project API key

```bash
curl -i -X POST http://localhost:8080/providers \
  -H "Authorization: Bearer YOUR_PROJECT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"smtp","channel":"email","credentials":{"host":"smtp-relay.brevo.com","port":587,"username":"apikey","password":"secret","from":"notifications@example.com"}}'
```

### 6. Optionally create a template

```bash
curl -i -X POST http://localhost:8080/templates \
  -H "Authorization: Bearer YOUR_PROJECT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"Welcome Email","channel":"email","subject":"Welcome","body":"Hello {{.name}}"}'
```

### 7. Send a notification with the current v1 payload

```bash
curl -i -X POST http://localhost:8080/notifications \
  -H "Authorization: Bearer YOUR_PROJECT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title":"Welcome","message":"Your order has shipped","channels":["email"],"recipient":{"email":"user@example.com","reference":"user-123"},"metadata":{"source":"manual-test"}}'
```

### 8. Verify persistence and delivery status

- The API returns `202 Accepted`.
- The terminal logs show delivery attempts for the requested channels.
- The notification is stored in PostgreSQL.

Confirm notification persistence with:

```bash
psql "postgres://yusuf:123456@localhost:5435/iwifunni?sslmode=disable" \
  -c "select id, project_id, service_id, title, message, channels, status, created_at from notifications order by created_at desc limit 5;"
```

Confirm channel attempts with:

```bash
psql "postgres://yusuf:123456@localhost:5435/iwifunni?sslmode=disable" \
  -c "select notification_id, channel, destination, status, error_message, attempted_at from delivery_attempts order by attempted_at desc limit 20;"
```

### Manual test scenarios

#### Missing auth

Send the same request without an authorization header and confirm `401 Unauthorized`.

#### Invalid API key

Send the same request with a bad API key and confirm the API returns `401 Unauthorized`.

#### Rate limiting

Send more than `RATE_LIMIT_PER_MINUTE` requests within a minute and confirm the API returns `429 Too Many Requests`.

### Current limitation

The current channel adapters are still provider stubs for push and SMS; test flow validates orchestration, persistence, and config lookup behavior. Email uses SMTP config and can be wired to a real provider credential.

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
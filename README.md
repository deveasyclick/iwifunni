# Iwifunni Notification Platform

A multi-tenant, API-driven notification platform in Go.

Iwifunni lets your backend services and SDKs send notifications through a single REST API. Projects are the top-level tenant unit. Each project owns its own providers, templates, API keys, and webhooks. Notifications are processed asynchronously via a Redis-backed queue and delivered through pluggable channel providers.

## Supported Delivery Channels

- Email (SMTP / SendGrid)
- SMS (Termii)
- Push (FCM / Web Push)

## Authentication

Iwifunni uses two auth systems:

| Mechanism | Format | Purpose |
|-----------|--------|---------|
| API Key | `Bearer nk_live_<token>` | Machine-to-machine — sending notifications and managing resources |
| JWT | `Bearer <jwt>` | Dashboard users — signup, signin, managing project settings |

## Architecture at a Glance

```
Client (SDK / API)
  ↓
API Key or JWT Middleware  →  resolve project_id
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
Fire webhooks for subscribed events
```

## Features

- Multi-tenant project model — every resource is scoped to a project
- Dual auth: API keys for SDK/backend, JWT for dashboard users
- Project-scoped provider registry — configure different email/SMS/push providers per project
- Template management — store and render Go text/template notification templates per project
- API key management — create, rotate, and revoke project API keys
- Webhook delivery — register endpoints to receive `notification.sent` / `notification.failed` events with HMAC-SHA256 signatures
- Asynchronous processing via Redis-backed Asynq workers
- Per-project rate limiting
- AES-GCM encryption for provider credentials at rest

## Delivery Flow

1. Client sends `POST /notifications` with `Authorization: Bearer nk_live_<key>`.
2. Middleware resolves the project and enforces rate limits.
3. Request is enqueued; API returns immediately.
4. Worker stores the notification record (`pending`), resolves the active provider for each requested channel from the project's provider config, and attempts delivery.
5. Notification status is updated (`sent`, `partial_failed`, or `failed`).
6. Webhooks subscribed to the resulting event are called asynchronously.

## Getting Started

### Prerequisites

- Go 1.26+
- PostgreSQL
- Redis
- goose CLI (`go install github.com/pressly/goose/v3/cmd/goose@latest`)
- sqlc CLI (`go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest`)

### Environment

Copy `.env.example` to `.env` and set the required values:

```
DATABASE_URL=postgres://...
REDIS_ADDR=localhost:6379
JWT_SECRET=<random-256-bit-hex>
ENCRYPTION_KEY=<random-32-byte-hex>
API_SERVICE_PORT=8080
```

### Run Migrations

```bash
goose -dir migrations postgres "$DATABASE_URL" up
```

### Run the Service

```bash
go run ./cmd/iwifunni
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
  "message": "Thanks for signing up!",
  "channels": ["email"],
  "recipient": {
    "email": "user@example.com"
  }
}
```

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
| GET | `/api-keys` | API Key | List API keys for the project |
| POST | `/api-keys` | API Key | Create a new API key |
| POST | `/api-keys/{keyID}/rotate` | API Key | Rotate (regenerate) an API key |
| DELETE | `/api-keys/{keyID}` | API Key | Revoke an API key |

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
  -H "Authorization: ApiKey YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title":"Hello","message":"Welcome","channels":["push","email"],"recipient":{"email":"user@example.com","push_tokens":["push-token-1"],"reference":"customer-123"},"metadata":{"order_id":"abc"}}'
```

## Manual Testing

Use this flow to test the app like a real client service would: create a service key, configure channels for that service, send a notification, and verify persisted delivery outcomes.

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
```

### 3. Create a service API key for authentication

```bash
go run ./cmd/iwifunni create-service --name manual-test-service --description "manual testing"
```

Copy the printed API key for the send request. Also fetch the service ID for channel setup:

```bash
psql "postgres://yusuf:123456@localhost:5435/iwifunni?sslmode=disable" \
  -c "select id, name, created_at from services order by created_at desc limit 5;"
```

### 4. Configure enabled channels for the service

Replace `SERVICE_ID` below with the UUID from the previous query.

```bash
psql "postgres://yusuf:123456@localhost:5435/iwifunni?sslmode=disable" \
  -c "insert into service_channel_configs (id, service_id, channel, enabled, provider, config_json)
      values
        (gen_random_uuid(), 'SERVICE_ID', 'email', true, 'smtp', '{\"host\":\"smtp-relay.brevo.com\",\"port\":587,\"username\":\"apikey\",\"password\":\"secret\",\"from\":\"notifications@example.com\"}'::jsonb),
        (gen_random_uuid(), 'SERVICE_ID', 'sms', true, 'termii', '{\"provider\":\"termii\",\"api_key\":\"secret\",\"sender_id\":\"iwifunni\"}'::jsonb),
        (gen_random_uuid(), 'SERVICE_ID', 'push', true, 'fcm', '{\"provider\":\"fcm\",\"server_key\":\"secret\"}'::jsonb)
      on conflict (service_id, channel) do update
      set enabled = excluded.enabled,
          provider = excluded.provider,
          config_json = excluded.config_json,
          updated_at = now();"
```

### 5. Run the service

```bash
go run ./cmd/iwifunni
```

### 6. Send a notification as a client service

```bash
curl -i -X POST http://localhost:8080/notifications \
  -H "Authorization: ApiKey YOUR_GENERATED_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title":"Welcome","message":"Your order has shipped","channels":["push","email","sms"],"recipient":{"email":"user@example.com","phone_number":"+2348012345678","push_tokens":["device-token-1"],"reference":"customer-123"},"metadata":{"order_id":"A123"}}'
```

### 7. Verify persistence and delivery status

- The API returns `202 Accepted`.
- The terminal logs show delivery attempts for the requested channels.
- The notification is stored in PostgreSQL.

Confirm notification persistence with:

```bash
psql "postgres://yusuf:123456@localhost:5435/iwifunni?sslmode=disable" \
  -c "select id, service_id, title, channels, recipient, status, created_at from notifications order by created_at desc limit 5;"
```

Confirm channel attempts with:

```bash
psql "postgres://yusuf:123456@localhost:5435/iwifunni?sslmode=disable" \
  -c "select notification_id, channel, destination, status, error_message, attempted_at from delivery_attempts order by attempted_at desc limit 20;"
```

### Manual test scenarios

#### Missing recipient destination

Send a payload without `recipient.email`, `recipient.phone_number`, and `recipient.push_tokens` and confirm `400 Bad Request`.

#### Channel disabled

Disable a channel in `service_channel_configs`, request that channel, and confirm delivery attempt is recorded as failed with the channel configuration error.

#### Invalid API key

Send the same request with a bad API key and confirm the API returns `401 Unauthorized`.

#### Missing required fields

Remove `title`, `message`, or `channels` and confirm the API returns `400 Bad Request`.

#### Rate limiting

Send more than `RATE_LIMIT_PER_MINUTE` requests within a minute and confirm the API returns `429 Too Many Requests`.

### Current limitation

The current channel adapters are still provider stubs for push and SMS; test flow validates orchestration, persistence, and config lookup behavior. Email uses SMTP config and can be wired to a real provider credential.

## Project Structure

- `cmd/iwifunni`: application entrypoint
- `internal/handlers`: REST handler and middleware
- `internal/auth`: API key authentication and rate limiting
- `internal/storage`: PostgreSQL storage wrapper and sqlc queries
- `internal/worker`: Redis job producer and consumer
- `internal/notifications`: notification orchestration and delivery attempt tracking
- `internal/channels`: provider-specific delivery adapters
- `migrations`: goose migration files
- `internal/db/queries`: sqlc query definitions
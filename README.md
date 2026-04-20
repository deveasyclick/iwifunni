# Iwifunni Notification Service

A secure, multi-channel notification service in Go.

Iwifunni is a backend service that lets other applications send notifications to users through a single API. Client services submit a notification request over REST or gRPC, the service authenticates and rate-limits the caller, queues the job for asynchronous processing, stores the notification in PostgreSQL, and then delivers it through one or more channels such as push, in-app, email, or SMS.

It is designed for product teams that want one place to manage notification delivery instead of wiring each channel directly into every application.

## Supported Delivery Channels

Iwifunni currently supports these delivery channels:

- In-app notifications broadcast over WebSocket.
- Push notifications through Firebase Cloud Messaging (FCM).
- Browser push notifications through Web Push subscriptions.
- Email delivery through Brevo.
- SMS delivery through Termii.

The service can also combine channels in a single notification request and use email or SMS as fallback delivery when push is unavailable and the user has opted in.

## What The App Does

- Accepts notification requests from internal or external services over REST and gRPC.
- Authenticates each calling service with an API key and enforces per-service rate limits.
- Queues notification jobs in Redis-backed Asynq workers so API requests return quickly.
- Persists notification records and user delivery preferences in PostgreSQL.
- Delivers notifications through in-app, FCM push, browser push, email, and SMS channels.
- Falls back to email and SMS when push delivery is unavailable and the user has opted in.

## Delivery Flow

1. A service sends a notification request with user ID, title, message, channels, and metadata.
2. Iwifunni validates the payload, verifies the API key, and checks the rate limit.
3. The request is enqueued for background processing.
4. A worker stores the notification and attempts delivery on the requested channels.
5. If in-app delivery is enabled, connected clients receive the event over WebSocket.
6. If push delivery fails, the service can fall back to email or SMS based on user preferences.

## Features

- REST API + gRPC API
- API key authentication for authorized services
- Redis-backed queue for asynchronous notification processing
- PostgreSQL storage with sqlc and goose migrations
- WebSocket broadcasting for in-app notifications
- Push notifications via FCM and browser Web Push
- Email via Brevo
- SMS via Termii
- Rate limiting per service
- Retry with exponential backoff

## Getting Started

### Prerequisites

- Go 1.26+
- PostgreSQL
- Redis
- goose CLI
- sqlc CLI

### Environment

Copy `.env.example` to `.env` and set values.

### Run Migrations

```bash
goose -dir migrations postgres "$DATABASE_URL" up
```

### Generate SQL Code

```bash
sqlc generate
```

### Run the Service

```bash
go run ./cmd/iwifunni
```

### Docker Compose

```bash
docker compose up --build
```

### Example REST Request

```bash
curl -X POST http://localhost:8080/notifications \
  -H "Authorization: ApiKey YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"user-123","title":"Hello","message":"Welcome","channels":["push","email"],"metadata":{"order_id":"abc"}}'
```

### Example gRPC Request

Use `grpcurl` or generated client from `api/proto/notifications.pb.go`.

## Project Structure

- `cmd/iwifunni`: application entrypoint
- `internal/api/rest`: REST handler and middleware
- `internal/api/grpc`: gRPC service implementation
- `internal/auth`: API key authentication and rate limiting
- `internal/storage`: PostgreSQL storage wrapper and sqlc queries
- `internal/worker`: Redis job producer and consumer
- `internal/notifications`: notification orchestration and fallback logic
- `internal/channels`: provider-specific delivery stubs
- `internal/ws`: WebSocket real-time notification support
- `migrations`: goose migration files
- `sql`: sqlc query definitions

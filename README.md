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

### Create A Service API Key

Generate and store a service credential with the built-in command:

```bash
go run ./cmd/iwifunni create-service --name checkout --description "Checkout service"
```

The command prints a one-time API key. Keep it safe and use it in REST requests as `Authorization: ApiKey <key>` or in gRPC requests as `api_key`.

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

## Manual Testing

Use this flow to test the app like a real user would: start the backend, connect a live client to the in-app channel, send a notification as a service, and verify what the user sees.

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
GRPC_PORT=9090
FCM_SERVER_KEY=test-fcm-key
WEBPUSH_PUBLIC_KEY=test-webpush-public-key
WEBPUSH_PRIVATE_KEY=test-webpush-private-key
BREVO_API_KEY=test-brevo-key
TERMII_API_KEY=test-termii-key
TERMII_SENDER_ID=iwifunni
RATE_LIMIT_PER_MINUTE=60
ENVIRONMENT=development
```

### 3. Create a service API key for authentication

```bash
go run ./cmd/iwifunni create-service --name manual-test-service --description "manual testing"
```

Copy the printed API key and use it in the next request.

### 4. Seed user delivery preferences

This allows fallback to email and SMS when push delivery fails.

```bash
psql "postgres://yusuf:123456@localhost:5435/iwifunni?sslmode=disable" \
  -c "insert into users_preferences (user_id, email_opt_in, sms_opt_in) values ('user-123', true, true) on conflict (user_id) do update set email_opt_in = excluded.email_opt_in, sms_opt_in = excluded.sms_opt_in;"
```

### 5. Run the service

```bash
go run ./cmd/iwifunni
```

### 6. Connect a live client to the in-app channel

Connect a WebSocket client to `ws://localhost:8080/ws`.

Example using `wscat`:

```bash
npx wscat -c ws://localhost:8080/ws
```

### 7. Send a notification as a client service

```bash
curl -i -X POST http://localhost:8080/notifications \
  -H "Authorization: ApiKey YOUR_GENERATED_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"user-123","title":"Welcome","message":"Your order has shipped","channels":["in_app","push","email","sms"],"metadata":{"order_id":"A123"}}'
```

### 8. Verify the user-facing result

- The API returns `202 Accepted`.
- The WebSocket client receives a live in-app notification payload.
- The terminal logs show delivery attempts for the requested channels.
- The notification is stored in PostgreSQL.

Confirm persistence with:

```bash
psql "postgres://yusuf:123456@localhost:5435/iwifunni?sslmode=disable" \
  -c "select user_id, title, message, channels, status, created_at from notifications order by created_at desc limit 5;"
```

### Manual test scenarios

#### In-app notification

Send a request with `"channels":["in_app"]` and confirm the WebSocket client immediately receives the JSON payload.

#### Push notification

Seed a push subscription first:

```bash
psql "postgres://yusuf:123456@localhost:5435/iwifunni?sslmode=disable" \
  -c "insert into push_subscriptions (id, user_id, channel, endpoint) values (gen_random_uuid(), 'user-123', 'fcm', 'device-token-1') on conflict do nothing;"
```

Then send a request with `"channels":["push"]` and confirm the push sender log appears.

#### Fallback behavior

Send a request with `"channels":["push"]` and no working push setup. If the user has email or SMS opt-in enabled, the service should attempt fallback delivery.

#### Invalid API key

Send the same request with a bad API key and confirm the API returns `401 Unauthorized`.

#### Missing required fields

Remove `title`, `message`, or `user_id` and confirm the API returns `400 Bad Request`.

#### Rate limiting

Send more than `RATE_LIMIT_PER_MINUTE` requests within a minute and confirm the API returns `429 Too Many Requests`.

### Current limitation

The in-app flow is the most realistic end-to-end manual test right now. Push, email, and SMS senders currently validate configuration and log delivery attempts, but they do not yet call live external providers.

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

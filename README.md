# Iwifunni Notification Service

A secure, multi-channel notification service in Go.

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

- Go 1.22+
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

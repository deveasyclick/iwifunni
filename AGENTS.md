# AGENTS

## Scope

These instructions apply to the whole repository. Start with [README.md](README.md) for the product overview, then use this file for the repo-specific behaviors that are easy to miss during quick exploration.

## Fast Start

- Use [Taskfile.yml](Taskfile.yml) for the supported developer commands.
- Validate backend changes with `go build ./...` and `task lint`.
- There is no test suite in this repo today; `**/*_test.go` is empty, so do not claim test coverage that was not added.
- Start local dependencies with `task db`, but verify ports before assuming the app can connect.

## Commands That Matter

- `task db`: starts Postgres and Redis via Docker Compose.
- `task build`: builds the service binary.
- `task dev`: starts the stack through `air` after bringing up dependencies.
- `task lint`: runs `golangci-lint`.
- `task sqlc`: regenerates database access code from [internal/db/queries/queries.sql](internal/db/queries/queries.sql).
- `task migrate:up` and `task migrate:down`: run Goose migrations from [migrations](migrations).
- `task swagger` is stale and currently points at a non-existent `cmd/zendo/main.go`; do not rely on it without fixing the task first.

## Generated Code Boundaries

- Treat [internal/db/models.go](internal/db/models.go) and [internal/db/queries.sql.go](internal/db/queries.sql.go) as generated files. Edit [internal/db/queries/queries.sql](internal/db/queries/queries.sql) and then run `task sqlc`.
- Treat [api/proto/notifications.pb.go](api/proto/notifications.pb.go) as generated from [api/proto/notifications.proto](api/proto/notifications.proto). If you change the proto, regenerate the Go bindings with `protoc`; there is no task for this yet.
- Schema changes belong in a new file under [migrations](migrations), not in ad hoc startup SQL.

## Architecture Map

- [cmd/iwifunni/main.go](cmd/iwifunni/main.go) wires the service together: config, PostgreSQL storage, Redis, Asynq producer and consumer, WebSocket server, REST handler, and gRPC server.
- [internal/api/rest/handler.go](internal/api/rest/handler.go) is the main REST pattern: Chi router, auth middleware, payload validation, then queueing a notification job.
- [internal/api/grpc/service.go](internal/api/grpc/service.go) mirrors the REST flow for gRPC, but it authenticates with `api_key` from the request body instead of the HTTP `Authorization: ApiKey ...` header.
- [internal/worker/producer.go](internal/worker/producer.go) and [internal/worker/consumer.go](internal/worker/consumer.go) define the queue contract. Keep `notification:send` stable unless you are intentionally breaking queued-job compatibility.
- [internal/notifications/manager.go](internal/notifications/manager.go) is the delivery orchestrator. It persists notifications, sends in-app events, attempts push delivery, and falls back to email or SMS using user preferences.
- [internal/ws/server.go](internal/ws/server.go) currently broadcasts every in-app event to every connected client. If you touch WebSocket behavior, account for the absence of per-user filtering and auth.

## Repo Conventions

- Prefer structured logging with `zerolog`, matching the existing style in the service entrypoint and worker paths.
- Pass `context.Context` through storage, queue, and channel operations.
- Use `github.com/google/uuid` for new IDs.
- Keep request handling thin. Business logic belongs in [internal/notifications/manager.go](internal/notifications/manager.go), storage in [internal/storage/storage.go](internal/storage/storage.go) and [internal/db](internal/db), transport-specific concerns in [internal/api/rest](internal/api/rest) and [internal/api/grpc](internal/api/grpc).

## Environment Pitfalls

- The configured connection defaults are inconsistent across the repo. Check all three before debugging local connectivity:
  - [internal/config/config.go](internal/config/config.go) defaults Postgres to `localhost:5432` and Redis to `localhost:6379`.
  - [Taskfile.yml](Taskfile.yml) hardcodes Postgres at `localhost:5434` for Goose.
  - [docker-compose.yml](docker-compose.yml) exposes Postgres on `5435` and Redis on `6380`.
- [internal/storage/storage.go](internal/storage/storage.go) auto-runs Goose migrations outside production. In production, migrations are intentionally skipped and must be run separately.
- The delivery providers in [internal/channels](internal/channels) are stubs or thin placeholders. Do not assume email, SMS, or push behavior is production-ready without verifying the implementation.

## Editing Guidance

- Keep fixes targeted. This repo has little automated protection, so avoid unrelated refactors while touching queueing, auth, or persistence.
- When changing SQL, migrations, or proto contracts, mention the required regeneration step in your final summary.
- When changing queue, auth, or delivery behavior, prefer validating with a real build and note any remaining runtime gaps explicitly.
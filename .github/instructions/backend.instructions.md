---
description: "Use when editing Go backend code, API handlers, auth middleware, notification services, queue processing, repositories, SQL queries, migrations, or provider integrations in Iwifunni. Covers the current backend architecture, layering, auth rules, and validation expectations."
name: "Iwifunni Backend Instructions"
applyTo:
  - "cmd/**/*.go"
  - "internal/**/*.go"
  - "migrations/**/*.sql"
  - "go.mod"
  - "sqlc.yaml"
  - "Taskfile.yml"
---

# Backend Instructions

- Start from the owning layer before editing. Router composition lives in [internal/app/app.go](../../internal/app/app.go), so route additions or auth changes should match the existing handler and middleware wiring there.
- Keep handlers thin. In files like [internal/notification/handler.go](../../internal/notification/handler.go), handlers should decode input, resolve auth context, call a service or queue producer, and shape the HTTP response. Do not move orchestration or persistence logic into handlers.
- Preserve the auth split in [internal/auth/jwt_middleware.go](../../internal/auth/jwt_middleware.go) and [internal/auth/middleware.go](../../internal/auth/middleware.go). JWT protects dashboard routes. `Authorization: Bearer ...` project API keys and legacy `Authorization: ApiKey ...` service keys follow separate paths and should not be merged accidentally.
- Treat tenant scoping as a hard requirement. Project-scoped resources must resolve `project_id` from auth context, and legacy service-scoped behavior should only be changed deliberately.
- Notification delivery is queue-driven. Changes that affect delivery should account for [internal/notification/handler.go](../../internal/notification/handler.go), [internal/queue](../../internal/queue), [internal/types/notification.go](../../internal/types/notification.go), and [internal/notification/service.go](../../internal/notification/service.go) together.
- Keep provider resolution behind the registry and channel adapters. Business logic should not call provider APIs directly. Provider credential handling must continue to encrypt secrets through [internal/provider/service.go](../../internal/provider/service.go).
- Repositories own database access. Services orchestrate use cases. If a change needs new SQL, update [internal/db/queries/queries.sql](../../internal/db/queries/queries.sql) or add a migration under [migrations](../../migrations), then regenerate generated artifacts instead of hand-editing [internal/db/models.go](../../internal/db/models.go) or [internal/db/queries.sql.go](../../internal/db/queries.sql.go).
- Pass `context.Context` through storage, queue, provider, and webhook calls. Use `github.com/google/uuid` for new identifiers to match the existing codebase.
- Several docs describe a more advanced notification workflow than the current handlers implement. If a task references `workflow_id`, subscriber targeting, or richer orchestration, verify whether the code already supports it before coding against the docs.
- Prefer the smallest validation that matches the change. Use `task build`, `task lint`, `task sqlc`, or a targeted Go test when relevant.
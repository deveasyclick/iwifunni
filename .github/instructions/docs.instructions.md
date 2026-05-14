---
description: "Use when updating README content, API docs, architecture docs, workflow docs, or planning notes for Iwifunni. Covers how to document the current implementation accurately, reconcile aspirational docs, and reflect backend and frontend behavior without inventing features."
name: "Iwifunni Docs Instructions"
applyTo:
  - "README.md"
  - "docs/**/*.md"
---

# Docs Instructions

- Treat the current code as the implementation source of truth. Use docs to explain or plan behavior, but verify the active behavior in the owning code before documenting it.
- When docs and code differ, do not silently pick one. Either update the docs to match the implementation or explicitly mark a flow as planned, stale, or not yet implemented.
- Confirm backend behavior against the actual handlers and middleware in [internal/app/app.go](../../internal/app/app.go), [internal/auth/middleware.go](../../internal/auth/middleware.go), [internal/auth/jwt_middleware.go](../../internal/auth/jwt_middleware.go), and the relevant service or handler package.
- Be careful with auth documentation. This repo currently has JWT dashboard auth, project API keys carried as `Bearer` tokens, and a legacy `ApiKey` service path. Do not collapse those into one flow unless the code has changed.
- Be careful with notification flow docs. Some existing documents describe `workflow_id`, subscriber targeting, and lifecycle states that are broader than the current request shape in [internal/notification/handler.go](../../internal/notification/handler.go) and [internal/types/notification.go](../../internal/types/notification.go).
- Keep validation and setup instructions aligned with the actual commands in [Taskfile.yml](../../Taskfile.yml), [docker-compose.yml](../../docker-compose.yml), and [web/package.json](../../web/package.json).
- When documenting schema or generated code changes, point readers to the real source files, such as [internal/db/queries/queries.sql](../../internal/db/queries/queries.sql), [migrations](../../migrations), and the generated sqlc outputs they drive.
- Prefer direct, concrete language. Avoid speculative statements like "the system supports" unless the code or committed roadmap in the repo actually supports that claim.
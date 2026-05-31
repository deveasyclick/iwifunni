# Iwifunni Project Guidelines

## Source Of Truth

- Start with [README.md](../README.md) and [docs/architecture.md](../docs/architecture.md) for product intent, then verify behavior in the current code before making changes.
- When docs and code disagree, treat the current implementation as the active behavior and either update the docs or call out the mismatch explicitly.

## Architecture

- The backend is wired in [internal/app/app.go](../internal/app/app.go). Keep handlers thin, keep business rules in services, and keep persistence in repositories.
- Authentication is intentionally split: dashboard routes use JWT in [internal/auth/jwt_middleware.go](../internal/auth/jwt_middleware.go), while API traffic uses project API keys and legacy service keys through [internal/auth/middleware.go](../internal/auth/middleware.go).
- Notification delivery flows through [internal/notification/handler.go](../internal/notification/handler.go), [internal/queue](../internal/queue), and [internal/notification/service.go](../internal/notification/service.go). Preserve queue-driven delivery and provider resolution through the registry.
- The frontend uses the Next.js App Router under [web/src/app](../web/src/app), shared backend proxy helpers in [web/src/lib/backend-api.ts](../web/src/lib/backend-api.ts), and the existing Tailwind plus layered CSS setup from [web/src/app/css/globals.css](../web/src/app/css/globals.css).

## Guardrails

- Preserve project scoping on resource access and do not bypass the current auth middleware conventions.
- Do not call notification providers directly from handlers or services outside the registry and channel adapter flow.
- Do not edit generated sqlc output in [internal/db/models.go](../internal/db/models.go) or [internal/db/queries.sql.go](../internal/db/queries.sql.go) directly; change queries or schema inputs and regenerate.
- Keep changes targeted. Avoid broad refactors unless the task explicitly requires one.
- For every api created, include an e2e test for it

## Validation

- Use [Taskfile.yml](../Taskfile.yml) commands when possible for backend validation, especially `task build`, `task lint`, and `task sqlc` when relevant.
- For frontend work, validate with the available `pnpm` scripts in [web/package.json](../web/package.json) that match the files you touched.

# Commit Message Rules
Follow Conventional Commit format for all commits.

Format:
<type>(<scope>): <summary>

Examples:
feat(web/login): Add social logins
fix(api/auth): Handle expired JWT tokens

Allowed types:
- feat
- fix
- hotfix
- style
- refactor
- perf
- docs
- test
- build
- ci
- chore
- revert

Rules:
- Every commit must include:
  - A short title
  - A descriptive body
- Keep commit messages concise and meaningful
- Use imperative tone
- Scope/domain should describe the affected area
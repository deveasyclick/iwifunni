# Project Completion Progress

## Current Position

- Active phase: Phase 2
- Active step: Step 3.1
- Current slice: Add reliability hardening around notification processing, retry semantics, and failure visibility
- Status: Steps 0.3 through 2.4 completed, Step 3.1 in progress

## Step Tracker

- [x] Step 0.1 - Audit and document the current v1 API and auth contract
- [x] Step 0.2 - Reconcile README, API docs, and architecture docs with the implementation baseline
- [x] Step 0.3 - Decide and document the legacy service-key path policy
- [x] Step 1.1 - Finish MVP backend gaps around existing domains
- [x] Step 1.2 - Finish MVP dashboard integration for implemented domains
- [x] Step 1.3 - Standardize local setup and manual verification flow
- [x] Step 2.1 - Design and implement the subscriber domain
- [x] Step 2.2 - Design and implement the workflow domain
- [x] Step 2.3 - Upgrade notification orchestration to support workflow or subscriber sends
- [x] Step 2.4 - Integrate template usage and subscriber preferences into workflow delivery
- [ ] Step 3.1 - Add reliability hardening
- [ ] Step 3.2 - Add security and authorization hardening
- [ ] Step 3.3 - Add operability and developer-quality coverage

## Progress Log

### 2026-05-14

- Completed Step 0.1.
- Added [docs/current-v1-contract.md](./current-v1-contract.md) to capture the current implemented router, auth modes, notification payload shape, and active management endpoints.
- Confirmed that current notification sends are `title` / `message` / `channels` / `recipient` based and do not currently use `workflow_id`.
- Confirmed that backend subscriber and workflow domains do not yet exist.
- Validation run: VS Code doc checks reported no errors, and `git status --short` shows the new docs files.

- Completed Step 0.2.
- Updated [README.md](../README.md), [API.md](./API.md), and [architecture.md](./architecture.md) so the public docs now align with the implemented v1 auth and notification contract.
- Removed stale workflow and subscriber claims from the live contract description and corrected auth, payload, provider, template, and local-run examples.
- Validation run: VS Code doc checks reported no errors, targeted consistency search found no remaining stale workflow or old-command references in the updated files, and `git status --short` shows the expected doc changes.

- Completed Step 0.3.
- Settled the legacy `Authorization: ApiKey <service_api_key>` path as deprecated compatibility behavior.
- Documented that new product work should use project API keys, while the legacy service path remains active only to avoid breaking existing send flows during MVP stabilization.
- Validation run: code search confirmed the legacy path is still wired into the notification send flow, and no current web app route depends on it.

- Completed Step 1.1.
- Added project-scoped notification history and detail backend support so the dashboard can list and inspect notification records.
- Unified project resolution across JWT dashboard traffic and API-key traffic through `auth.GetProjectID(ctx)`, then reused that for notification, provider, template, and webhook handlers.
- Validation run: `task sqlc && go build ./cmd/api ./cmd/worker` succeeded after the repository query fix.

- Completed Step 1.2.
- Added Next.js proxy routes and dashboard management flows for notifications, providers, webhooks, and templates.
- Replaced settings placeholders with live management screens for implemented backend domains and kept notification screens on real backend data with fallback behavior only on fetch failure.
- Validation run: `pnpm build` succeeded from `web` after the notifications, provider, webhook, and template dashboard slices.

- Completed Step 1.3.
- Fixed the broken local workflow drift across `Taskfile.yml`, `.env.example`, and `README.md`.
- Standardized the documented local run path around `task server`, `task worker`, and `task web`, aligned the local env example with the Docker-exposed Postgres and Redis ports, and corrected the Taskfile build and worker commands.
- Validation run: `task build && task --list` succeeded from the repo root, and editor diagnostics for the touched files were clean.

- Completed Step 2.1.
- Added a real project-scoped subscriber domain with a new migration, sqlc CRUD queries, repository/service/handler layers, and router registration for both JWT dashboard traffic and project API-key traffic.
- Added subscriber proxy routes in Next.js so the existing dashboard list, create, detail, update, and delete flows now target live backend data instead of missing routes.
- Fixed the subscriber edit flow to preserve push tokens and validate channel-specific contact requirements before update.
- Validation run: `task sqlc && go build ./cmd/api ./cmd/worker` succeeded, `pnpm build` succeeded from `web`, and editor diagnostics for the touched backend and frontend files were clean.

- Completed Step 2.2.
- Added a real project-scoped workflow domain with migration, sqlc CRUD queries, repository/service/handler layers, and router registration for both JWT dashboard traffic and project API-key traffic.
- Added workflow proxy routes, a workflow dashboard page at `/dashboard/apps/workflows`, and a live overview card so the existing dashboard navigation no longer points to a missing route.
- Updated the contract docs so they now distinguish between implemented subscriber and workflow management domains and the still-pending workflow-based notification send contract.
- Validation run: `task sqlc && go build ./cmd/api ./cmd/worker` succeeded, `pnpm build` succeeded from `web`, and editor diagnostics for the touched workflow and docs files were clean.

- Completed Step 2.3.
- Extended `POST /notifications` so it now supports both the legacy direct payload and a workflow-targeted payload that accepts `workflow_id` and `subscriber_id` alongside `title` and `message`.
- Added notification send-path validation that resolves workflow channels and subscriber recipient data before enqueue, while preserving the current raw payload path and the existing delivery pipeline.
- Kept template-driven workflow rendering and subscriber preference-aware filtering out of this step so the next slice can add them explicitly without changing the migration-safe dual contract.
- Validation run: `go build ./cmd/api ./cmd/worker` succeeded before and after `gofmt`, and the contract docs were updated to match the code.

- Completed Step 2.4.
- Added workflow-linked template rendering so each workflow channel now delivers rendered content from its linked template rather than reusing one global message body.
- Added skip-aware subscriber delivery so unsubscribed, bounced, unmapped, or contactless workflow channels are recorded as skipped instead of failing the whole workflow send.
- Added `partial_skipped` and `skipped` notification statuses to reflect workflow sends where some or all channels were intentionally skipped.
- Validation run: `gofmt -w internal/types/notification.go internal/notification/*.go internal/registry/registry.go && go build ./cmd/api ./cmd/worker` succeeded, and editor diagnostics for the touched backend and docs files were clean.

## Update Rule

After each implementation slice, update this file with:

- Active phase
- Active step
- Status
- What changed
- Validation run
- Next step

## Immediate Next Step

Step 3.1: add reliability hardening around retry semantics, skipped or failed delivery visibility, and queue processing behavior.
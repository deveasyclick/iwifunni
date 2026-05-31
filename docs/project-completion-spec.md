# Project Completion Specification

## Purpose

This document defines how to take Iwifunni from its current mixed state into a coherent, shippable product.

The completion strategy is phased:

1. Stabilize and ship a real MVP based on what the current code already supports.
2. Close the major gap between the current implementation and the richer product model described in the docs.
3. Harden the platform for production use.

This spec treats the current codebase as the implementation source of truth. Where the current docs describe behavior that does not yet exist in code, that behavior is treated as planned scope, not current capability.

## Current State Summary

### Implemented Foundations

The repo already contains meaningful backend and frontend foundations:

- Project-scoped backend routing is wired in [internal/app/app.go](../internal/app/app.go).
- Dashboard auth exists through JWT middleware in [internal/auth/jwt_middleware.go](../internal/auth/jwt_middleware.go).
- API traffic is authenticated through project API keys and a legacy service-key path in [internal/auth/middleware.go](../internal/auth/middleware.go).
- Notification enqueue and delivery orchestration exist in [internal/notification/handler.go](../internal/notification/handler.go) and [internal/notification/service.go](../internal/notification/service.go).
- API key management exists in [internal/api_key/handler.go](../internal/api_key/handler.go).
- Template management exists in [internal/templates/handler.go](../internal/templates/handler.go).
- Provider management and provider secret encryption exist in [internal/provider/service.go](../internal/provider/service.go).
- Webhook management exists in [internal/webhooks/handler.go](../internal/webhooks/handler.go).
- The web app already contains landing, auth, settings, notifications, and subscriber-related dashboard surfaces under [web/src/app](../web/src/app).

### Major Gaps

The repo also has a large gap between documented product vision and implemented backend behavior:

- The current notification send contract is based on `title`, `message`, `channels`, and `recipient` in [internal/notification/handler.go](../internal/notification/handler.go) and [internal/types/notification.go](../internal/types/notification.go).
- The docs currently describe a richer `workflow_id` and subscriber-driven notification model in [README.md](../README.md) and [docs/architecture.md](architecture.md).
- There is currently no backend `subscriber` or `workflow` domain under [internal](../internal).
- Some dashboard surfaces imply subscriber-centric and workflow-centric product behavior that the backend does not yet expose.
- Local setup and command documentation are not fully aligned across [README.md](../README.md), [Taskfile.yml](../Taskfile.yml), and [docker-compose.yml](../docker-compose.yml).

## Completion Definition

The project is considered complete when it satisfies all of the following:

1. A project owner can sign up, sign in, and manage a project through the dashboard.
2. A project owner can create and manage project API keys, providers, templates, and webhooks without undocumented manual database steps.
3. A client can send notifications through a documented, stable API contract and observe delivery state.
4. Dashboard flows reflect real backend behavior and do not rely on placeholder or aspirational functionality.
5. Documentation accurately distinguishes current behavior, planned behavior, and legacy compatibility behavior.
6. Local setup, build, lint, migration, and testing workflows are reproducible.
7. Core paths have enough automated validation to catch regressions before release.

If the richer workflow and subscriber model is included in the completion target, then those domains must also be fully implemented across schema, backend, dashboard, and docs before the project is considered complete.

## Product Contract Strategy

Completion should use a two-track contract strategy.

### Track A: Ship the Implemented Platform

Track A defines the real MVP based on what the code already supports today:

- JWT dashboard auth
- Project API keys
- Provider management
- Template management
- Webhook management
- Queue-driven notification delivery
- Dashboard management flows for implemented backend features

Track A should be documented and shipped first.

### Track B: Deliver the Richer Notification Model

Track B adds the domains that are described in the docs but not yet implemented in the backend:

- Subscribers
- Workflows
- Workflow-driven notification sends
- Channel resolution from workflow configuration
- Preference-aware delivery behavior

Track B should be implemented explicitly as a new phase, not implied through documentation or partial frontend screens.

## Phased Delivery Plan

## Phase 0: Baseline and Contract Freeze

### Objective

Freeze the real product baseline and stop mixing current implementation with future vision.

### Required Outcomes

- Audit the active backend surface in [internal/app/app.go](../internal/app/app.go).
- Confirm the real notification request shape in [internal/notification/handler.go](../internal/notification/handler.go) and [internal/types/notification.go](../internal/types/notification.go).
- Confirm the active auth split in [internal/auth/middleware.go](../internal/auth/middleware.go) and [internal/auth/jwt_middleware.go](../internal/auth/jwt_middleware.go).
- Update core docs so they clearly label implemented behavior versus planned behavior.
- Decide the role of the legacy service-key path: compatibility mode or deprecated path.

### Deliverables

- A corrected v1 API contract for currently implemented behavior.
- A documented Track A versus Track B scope split.
- A list of stale or aspirational docs that must be updated before MVP release.

## Phase 1: MVP Completion Around Current Capabilities

### Objective

Make the currently implemented product coherent, usable, and demoable end to end.

### MVP User Journey

At the end of Phase 1, a new user should be able to:

1. Sign up and sign in.
2. Access the dashboard.
3. Create or manage project API keys.
4. Configure at least one provider.
5. Create or update templates.
6. Register webhooks.
7. Send a notification through the supported current API contract.
8. View notification history and delivery status.

### Backend Workstream

Backend MVP completion should:

- Keep handler wiring in [internal/app/app.go](../internal/app/app.go).
- Keep handlers thin and business logic in services and repositories.
- Ensure project scoping is enforced consistently for API keys, templates, providers, webhooks, organizations, and projects.
- Add or finish the endpoints required for dashboard notification history and detail views if they are missing.
- Decide whether the legacy service-based notification path remains public, stays as compatibility mode, or is retired from the product contract.
- Keep notification delivery queue-driven through [internal/queue](../internal/queue) and [internal/notification/service.go](../internal/notification/service.go).

### Frontend Workstream

Frontend MVP completion should:

- Turn existing dashboard screens under [web/src/app/dashboard](../web/src/app/dashboard) into real product flows backed by live data.
- Keep backend access routed through [web/src/lib/backend-api.ts](../web/src/lib/backend-api.ts) and route handlers under [web/src/app/api](../web/src/app/api).
- Finish auth integration for login and registration flows.
- Finish settings flows for API keys, providers, templates, and webhooks.
- Ensure notification list and detail screens only expose behavior that the backend actually supports.

### Documentation Workstream

During Phase 1, documentation should:

- Rewrite the README getting-started path so it matches actual commands and ports.
- Remove or label stale examples that use unsupported notification payload shapes.
- Provide one canonical local development flow.

### Phase 1 Acceptance Criteria

- Signup and signin work through the documented flow.
- Project API keys can be created, rotated, and revoked.
- Providers can be created and updated for project-scoped delivery.
- Templates can be created, listed, updated, deleted, and rendered.
- Webhooks can be created, listed, and deleted.
- Notifications can be sent using the supported current request body and produce status records.
- Dashboard screens for implemented domains are connected to backend data and not placeholder-only.
- README setup instructions work without requiring readers to reconcile contradictory docs.

## Phase 2: Add Subscribers and Workflows

### Objective

Introduce the richer domain model that the current docs describe but the backend does not yet implement.

### Subscriber Domain Workstream

Add a project-scoped subscriber domain with:

- Database schema and migrations
- sqlc queries in [internal/db/queries/queries.sql](../internal/db/queries/queries.sql)
- Repository, service, and handler layers under [internal](../internal)
- REST endpoints for create, list, get, update, and delete
- Dashboard integration for list, filter, detail, and edit flows

The subscriber contract should define:

- Subscriber identity model
- External reference handling
- Contact channels
- Metadata
- Status and opt-in or opt-out behavior

### Workflow Domain Workstream

Add a project-scoped workflow domain with:

- Workflow entities and storage
- Channel resolution rules
- Template linkage
- Optional fallback or ordering behavior
- Dashboard configuration flows

The workflow layer should own channel selection so clients do not have to provide raw `channels` when using the new workflow-based send contract.

### Notification Orchestration Workstream

Expand [internal/notification](../internal/notification) so notifications can target subscribers and workflows in addition to the current raw recipient model.

This phase must explicitly decide one of the following:

1. Support both the current payload and the new workflow-based payload during migration.
2. Introduce a versioned endpoint or contract for the new notification model.

### Template and Preference Integration

Once subscribers and workflows exist:

- Templates should support workflow-linked usage.
- Subscriber preferences should affect delivery eligibility.
- Skipped, unsubscribed, or bounced behavior should be modeled in storage and delivery reporting.

### Phase 2 Acceptance Criteria

- Subscribers exist as a real backend domain and not only as dashboard UI.
- Workflows exist as a real backend domain and own channel resolution logic.
- Notification sends can use the documented workflow-based contract.
- Dashboard subscriber and workflow screens are backed by live endpoints.
- Public docs only claim workflow or subscriber support once backend, schema, and dashboard support are complete.

## Phase 3: Production Readiness

### Objective

Harden the completed platform for reliability, security, observability, and supportability.

### Reliability Workstream

- Define queue retry behavior and failure semantics.
- Add idempotency strategy for send requests.
- Add dead-letter or durable failure capture behavior.
- Tighten notification status transition rules.
- Improve webhook delivery durability and traceability.

### Security Workstream

- Verify project-scoped authorization across all endpoints.
- Confirm provider credential and webhook secret handling.
- Reduce sensitive logging.
- Verify API key lifecycle behavior, including rotation and revocation.
- Decide whether the legacy service-key path is still supported publicly.

### Operability Workstream

- Standardize environment variables, ports, and startup commands.
- Document repeatable migrations and sqlc regeneration.
- Add health or readiness endpoints if deployment requires them.
- Ensure local and deployment setup docs are aligned.

### Developer Quality Workstream

- Add automated validation around auth middleware.
- Add automated validation around notification send orchestration.
- Add automated validation around provider resolution.
- Add automated validation around API key lifecycle.
- Add automated validation around template rendering and webhook behavior.
- Add focused frontend validation for auth and settings flows if UI regression protection is needed.

### Phase 3 Acceptance Criteria

- Build, lint, migration, and local-run flows are repeatable.
- Core backend slices have meaningful automated coverage.
- Notification processing and webhook dispatch are observable enough to diagnose failures.
- Docs reflect production-ready behavior rather than just local experimentation.

## Milestones

- Milestone A: Baseline audit and documentation correction
- Milestone B: MVP backend and dashboard completion around implemented features
- Milestone C: Subscriber domain delivery
- Milestone D: Workflow domain and new notification contract delivery
- Milestone E: Production hardening

This order is recommended because it ships value early and avoids building frontend and docs on top of unstable contracts.

## Dependencies and Parallelism

- Documentation correction should begin in Phase 0 and continue through all phases.
- Backend MVP endpoint completion and dashboard integration can proceed in parallel once the Track A contract is frozen.
- Subscriber UI and subscriber backend should be built together.
- Workflow design can begin early, but notification orchestration changes should wait until subscriber and workflow storage contracts are stable.
- Production hardening should begin after the primary product contract is no longer moving quickly.

## Risks and Decision Points

### Legacy Service-Key Path

The repo currently supports a legacy service-key path alongside project API keys. This must be classified explicitly:

- Supported compatibility surface
- Deprecated but temporarily retained surface
- Internal-only path scheduled for removal

This decision affects auth documentation, endpoint behavior, and migration planning.

### Notification Contract Migration

If Track B is implemented, the project must choose how to migrate from the current `title` / `message` / `channels` / `recipient` request shape to a workflow-based contract.

The safest option is a clear compatibility or versioning strategy rather than a silent contract rewrite.

### Dashboard Scope

Given the existing frontend investment, dashboard completion should be included in the definition of project completion. API-only completion would leave a large portion of the repo in a partially finished state.

## Verification Plan

### Phase 1 Verification

Validate the MVP checklist against a real local run:

1. Signup
2. Signin
3. API key create
4. Provider create
5. Template create and render
6. Webhook create
7. Notification send
8. Dashboard access and management flows

### Phase 2 Verification

Before public docs claim subscriber or workflow support, verify:

1. Schema exists
2. Handlers and services exist
3. Dashboard integration exists
4. Notification orchestration uses the new model as documented

### Phase 3 Verification

Verify:

1. Repeatable build and lint workflows
2. Repeatable migration and sqlc workflows
3. Core regression tests over auth, notification orchestration, and settings flows
4. Documentation consistency across README, architecture, API, and setup guides

## Summary

Iwifunni should not be completed by treating its docs vision as if it already exists. It should be completed by first shipping the platform that the code already supports, then deliberately adding subscribers and workflows as real backend domains, and finally hardening the system for production.

That path keeps the product coherent, reduces churn, and makes the repo's backend, frontend, and docs converge on a single truthful system.
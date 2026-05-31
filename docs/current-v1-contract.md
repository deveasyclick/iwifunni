# Current V1 Contract Baseline

## Purpose

This document describes the backend contract that is currently implemented in code.

It is the source of truth for the currently implemented backend contract. If other docs describe richer behavior, treat that behavior as planned until the code supports it.

## Active Router Surface

The active HTTP router is composed in [internal/app/app.go](../internal/app/app.go).

### Public Auth Routes

- `POST /auth/signup`
- `POST /auth/signin`
- `POST /auth/refresh`
- `POST /auth/logout`

### JWT-Protected Routes

These routes use dashboard JWT auth through [internal/auth/jwt_middleware.go](../internal/auth/jwt_middleware.go).

- API key management routes under `/api-keys`
- Notification read routes under `/notifications`
- Template routes under `/templates`
- Provider routes under `/providers`
- Webhook routes under `/webhooks`
- Subscriber routes under `/subscribers`
- Workflow routes under `/workflows`

### API-Key-Protected Routes

These routes use [internal/auth/middleware.go](../internal/auth/middleware.go).

- `POST /notifications`
- Template routes under `/templates`
- Provider routes under `/providers`
- Webhook routes under `/webhooks`
- Subscriber routes under `/subscribers`
- Workflow routes under `/workflows`
- Organization routes under `/organizations`
- Project routes under `/organizations/{orgID}/projects` and `/projects/{projectID}`

## Authentication Contract

### Dashboard JWT Auth

Dashboard routes require `Authorization: Bearer <jwt>`.

The JWT middleware parses access tokens and places claims in request context. Those claims include `user_id`, `project_id`, and `role`.

### Project API Key Auth

Project API access uses `Authorization: Bearer <project_api_key>`.

The auth middleware resolves the project key by prefix, validates the stored hash, checks key status and expiry, enforces the `notifications:write` scope, rate limits by API key ID, and attaches authenticated project context to the request.

### Legacy Service-Key Auth

The same middleware also supports a legacy path using `Authorization: ApiKey <service_api_key>`.

This path resolves a legacy service record, rate limits by service ID, and attaches service context.

Policy decision for the completion plan:

- Keep this path active for backward compatibility during MVP stabilization.
- Treat it as deprecated compatibility behavior, not the primary public contract.
- Do not build new dashboard or public product flows on top of this path.
- Prefer project API keys with `Authorization: Bearer <project_api_key>` for current and new work.
- Re-evaluate removal only after project-scoped notification flows fully cover the intended product story.

## Auth Endpoints

### POST /auth/signup

Defined in [internal/app/auth_handler.go](../internal/app/auth_handler.go).

Request body:

```json
{
  "email": "user@example.com",
  "password": "secret",
  "project_name": "Acme",
  "api_key_name": "Default API Key"
}
```

Behavior:

- Requires `email`, `password`, and `project_name`
- Creates a user
- Creates a project
- Creates an owner membership for that project
- Creates a default project API key
- Returns JWT session tokens and the raw project API key

Response shape is defined by `auth.SignupResult` in [internal/auth/service.go](../internal/auth/service.go):

```json
{
  "user_id": "uuid",
  "project_id": "uuid",
  "role": "owner",
  "api_key": "nk_live_...",
  "access_token": "...",
  "refresh_token": "..."
}
```

### POST /auth/signin

Request body:

```json
{
  "email": "user@example.com",
  "password": "secret"
}
```

Response shape is defined by `auth.SigninResult` in [internal/auth/service.go](../internal/auth/service.go):

```json
{
  "user_id": "uuid",
  "project_id": "uuid",
  "role": "owner",
  "access_token": "...",
  "refresh_token": "..."
}
```

### POST /auth/refresh

Request body:

```json
{
  "refresh_token": "..."
}
```

Response shape matches `auth.RefreshResult` in [internal/auth/service.go](../internal/auth/service.go):

```json
{
  "user_id": "uuid",
  "project_id": "uuid",
  "role": "owner",
  "access_token": "...",
  "refresh_token": "..."
}
```

### POST /auth/logout

Request body:

```json
{
  "refresh_token": "..."
}
```

Returns `204 No Content` on success.

## Notifications Contract

### POST /notifications

Defined in [internal/notification/handler.go](../internal/notification/handler.go).

This route now supports two currently implemented send modes.

#### Direct send mode

Request body:

```json
{
  "title": "Welcome",
  "message": "Thanks for joining",
  "channels": ["email"],
  "recipient": {
    "email": "user@example.com",
    "phone_number": "+1234567890",
    "push_tokens": ["token-1"],
    "reference": "customer-123"
  },
  "metadata": {
    "source": "signup"
  }
}
```

#### Workflow-targeted send mode

Request body:

```json
{
  "workflow_id": "uuid",
  "subscriber_id": "uuid",
  "title": "Welcome",
  "message": "Thanks for joining",
  "metadata": {
    "source": "signup"
  }
}
```

Behavior:

- Accepts either:
  - raw `title`, `message`, `channels`, `recipient`, and optional `metadata`
  - or `workflow_id`, `subscriber_id`, `title`, `message`, and optional `metadata`
- Workflow-targeted sends require project-scoped auth and do not use the legacy service-key path
- Workflow-targeted sends resolve `channels` from the workflow record, `recipient` from the subscriber record, and per-channel rendered delivery content from linked templates before enqueue and delivery
- Channels with missing templates, missing contact targets, or subscriber channel status of `unsubscribed` or `bounced` are skipped instead of failing the whole send
- Resolves either authenticated project context or legacy service context
- Enqueues the notification job through the queue producer
- Returns `202 Accepted` with `{ "status": "queued" }`

The queue payload shape is defined in [internal/types/notification.go](../internal/types/notification.go).

## Notification Delivery Behavior

The delivery service is implemented in [internal/notification/service.go](../internal/notification/service.go).

Current behavior:

- Requires at least one channel
- Persists notifications under a project-based path or legacy service-based path
- Supports raw sends and workflow-targeted sends while keeping the same downstream delivery pipeline
- For workflow-targeted sends, resolves channels from the workflow record, recipient contact data from the subscriber record, and rendered per-channel content from linked templates
- Records skipped delivery attempts when a workflow channel is unsubscribed, bounced, missing a linked template, or missing a required subscriber contact target
- Resolves active providers by channel
- Uses the provider registry for provider lookup
- Records delivery attempts per channel and destination
- Updates final notification status to `sent`, `partial_failed`, or `failed`
- Dispatches `notification.sent` or `notification.failed` webhook events when a webhook dispatcher is configured

Current status values visible in code include:

- `pending`
- `sent`
- `partial_failed`
- `failed`
- `partial_skipped`
- `skipped`

## API Key Management Contract

Defined in [internal/api_key/handler.go](../internal/api_key/handler.go).

These routes currently rely on JWT-authenticated dashboard access.

- `GET /api-keys`
- `POST /api-keys`
- `POST /api-keys/{keyID}/rotate`
- `DELETE /api-keys/{keyID}`
- `PATCH /api-keys/{keyID}`

Current supported status update values in `PATCH /api-keys/{keyID}` are:

- `active`
- `disabled`

## Template Management Contract

Defined in [internal/templates/handler.go](../internal/templates/handler.go).

Current routes:

- `POST /templates`
- `GET /templates`
- `POST /templates/render`
- `GET /templates/{templateID}`
- `PATCH /templates/{templateID}`
- `DELETE /templates/{templateID}`

Current template create contract requires:

- `name`
- `channel`
- `body`

Supported channels are:

- `email`
- `sms`
- `push`

Templates are project-scoped and can be rendered directly through `POST /templates/render` using `template_id` and `variables`.

## Provider Management Contract

Defined in [internal/provider/handler.go](../internal/provider/handler.go).

Current routes:

- `POST /providers`
- `GET /providers`
- `GET /providers/{providerID}`
- `PUT /providers/{providerID}`
- `DELETE /providers/{providerID}`

Current create and update contract requires:

- `name`
- `channel`
- `credentials`

Provider secrets are encrypted before storage through [internal/provider/service.go](../internal/provider/service.go).

## Webhook Management Contract

Defined in [internal/webhooks/handler.go](../internal/webhooks/handler.go).

Current routes:

- `POST /webhooks`
- `GET /webhooks`
- `DELETE /webhooks/{webhookID}`

Current create contract requires:

- `url`
- `events`
- `secret`

Current outbound event names visible in the notification flow are:

- `notification.sent`
- `notification.failed`

## Subscriber Management Contract

Defined in [internal/subscriber/handler.go](../internal/subscriber/handler.go).

Current routes:

- `POST /subscribers`
- `GET /subscribers`
- `GET /subscribers/{subscriberID}`
- `PUT /subscribers/{subscriberID}`
- `DELETE /subscribers/{subscriberID}`

Subscriber records are project-scoped and currently support:

- `name`
- optional `email`
- optional `phone`
- optional `pushToken`
- `channels`
- per-channel `status`
- `tags`

At least one channel is required, and each selected channel must have a matching contact target.

## Workflow Management Contract

Defined in [internal/workflow/handler.go](../internal/workflow/handler.go).

Current routes:

- `POST /workflows`
- `GET /workflows`
- `GET /workflows/{workflowID}`
- `PUT /workflows/{workflowID}`
- `DELETE /workflows/{workflowID}`

Workflow records are project-scoped and currently support:

- `key`
- `name`
- optional `description`
- ordered `channels`
- optional `templateIds` keyed by channel
- `isActive`

These workflow records now participate in the active `POST /notifications` send contract for workflow-targeted sends by supplying channel resolution metadata.
They also supply per-channel template linkage for workflow-targeted rendering.

## Organization and Project Contract

Organization and project handlers are active in the router and protected by auth middleware.

Current organization routes in [internal/organization/handler.go](../internal/organization/handler.go):

- `POST /organizations`
- `GET /organizations`
- `GET /organizations/{orgID}`

Current project routes in [internal/project/handler.go](../internal/project/handler.go):

- `POST /organizations/{orgID}/projects`
- `GET /organizations/{orgID}/projects`
- `GET /projects/{projectID}`

These routes currently use JWT-based authenticated user context.

## Explicit Non-Goals For Current V1

The following are not currently implemented as first-class backend features and must not be documented as active v1 behavior:

- Subscriber preference models beyond the current per-channel `subscribed` / `unsubscribed` / `bounced` status handling
- Advanced workflow orchestration beyond direct workflow-to-template channel mappings
- Rich notification lifecycle states beyond what is currently visible in code

## How To Use This Baseline

- Use this file as the implementation baseline when updating README, API docs, and architecture docs.
- Treat richer behavior described elsewhere as planned work until the code and schema are added.
- Update this file when the active contract changes, especially when Step 3 expands reliability semantics or richer preference handling.
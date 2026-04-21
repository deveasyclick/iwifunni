# Notification Service Plan

## Goal

Turn this project into a focused notification sending service for other applications.

The service should:

- authenticate sending services
- accept explicit recipients in each request
- send notifications through configured channels such as email, SMS, and push
- record notification and delivery outcomes
- avoid owning a platform-wide user model unless that becomes an explicit product decision

## Product Boundary

This service should behave like delivery infrastructure, not like a notification platform.

It should own:

- service authentication and API keys
- service-level channel configuration
- notification intake
- queued delivery
- delivery attempt tracking

It should not own, for the MVP:

- user accounts
- user preference centers
- in-app inbox state
- platform-wide recipient identity

## Recommended Architecture

Use a sender-plus-recipient model.

- `service` = authenticated sender or tenant
- `recipient` = explicit delivery destination passed in the request
- `notification` = accepted send request
- `delivery_attempt` = result of trying a specific channel

This means the service keeps `service_id`, but removes `user_id` as the core recipient model.

## Why This Direction Fits

The current codebase already has the right operational backbone:

- API key authentication
- per-service rate limiting
- background queueing
- worker-based orchestration
- channel abstraction

What is currently off-track is the user-centric data model built around `user_id`, `users_preferences`, and `push_subscriptions`.

That model makes sense for a user notification platform, but not for a simple notification sending service.

## Recommended MVP Data Model

### 1. services

Purpose:
- authenticated senders
- service ownership boundary

Suggested fields:
- `id`
- `name`
- `api_key` or `api_key_hash`
- `description`
- `created_at`

### 2. service_channel_configs

Purpose:
- define what channels a service can use
- store service-specific channel settings or provider references

Suggested fields:
- `id`
- `service_id`
- `channel`
- `enabled`
- `provider`
- `config_json`
- `created_at`
- `updated_at`

### 3. notifications

Purpose:
- record accepted notification requests

Suggested fields:
- `id`
- `service_id`
- `title`
- `message`
- `idempotency_key`
- `channels`
- `recipient_json`
- `metadata_json`
- `status`
- `created_at`
- `updated_at`

### 4. delivery_attempts

Purpose:
- track channel-specific execution and outcomes

Suggested fields:
- `id`
- `notification_id`
- `channel`
- `destination`
- `status`
- `error_message`
- `provider_message_id`
- `attempted_at`

## Recommended Request Model

Use explicit recipient data instead of `user_id`.

Example shape:

```json
{
  "title": "Order shipped",
  "message": "Your order is on the way",
  "idempotency_key": "order-shipped-A123",
  "channels": ["email", "sms"],
  "recipient": {
    "email": "user@example.com",
    "phone_number": "+2348012345678",
    "push_tokens": ["token-1"],
    "reference": "customer-123"
  },
  "metadata": {
    "order_id": "A123"
  }
}
```

Notes:

- `reference` is optional and can be the calling app's own user ID or recipient ID.
- The service should not interpret `reference` as a platform-owned user.
- Each requested channel must have a valid destination available in `recipient`.
- `idempotency_key` should be scoped by `service_id` and used for server-side deduplication.

## Idempotency

The service should support server-side deduplication through `idempotency_key`.

Recommended behavior:

- the caller may send an `idempotency_key` with a notification request
- the service stores it on `notifications`
- the service enforces uniqueness on `(service_id, idempotency_key)`
- repeated requests with the same `(service_id, idempotency_key)` should not create duplicate sends

This protects callers that retry requests after timeouts or uncertain failures.

Tradeoff:

- safer retries and fewer duplicate sends

Likely pitfall:

- treating `recipient.reference` as deduplication input instead of using a dedicated idempotency field

## Service Channel Config Source Of Truth

The medium-term source of truth for per-service channel configuration should be `service_channel_configs.config_json`.

That means:

- channel config is stored in the database as JSON
- config is loaded at send time based on `service_id` and `channel`
- config is validated by the application before being persisted or used

Examples of `config_json` by channel:

Email:

```json
{
  "host": "smtp-relay.brevo.com",
  "port": 587,
  "username": "apikey",
  "password": "secret",
  "from": "notifications@example.com"
}
```

SMS:

```json
{
  "provider": "termii",
  "api_key": "secret",
  "sender_id": "iwifunni"
}
```

Push:

```json
{
  "provider": "fcm",
  "server_key": "secret"
}
```

Tradeoff:

- flexible storage and fewer schema changes as providers evolve

Likely pitfall:

- allowing arbitrary unvalidated JSON to become the runtime config format


## Approaches, Tradeoffs, and Likely Pitfalls

### Approach 1: Support both REST and gRPC

Description:
- keep both transports on top of one shared internal request model

Tradeoffs:
- broadest compatibility
- supports both internal and external consumers

Likely pitfalls:
- duplicated maintenance
- request drift between transport layers
- slower domain refactoring while the model is still unstable


### Approach 2: Explicit recipients with optional reference

Description:
- use channel-specific destinations
- allow optional `recipient.reference`

Tradeoffs:
- best fit for this product
- explicit and easy to reason about
- still lets sending apps attach their own identity reference

Likely pitfalls:
- callers must always provide enough recipient data
- developers may be tempted to treat `reference` as a hidden `user_id` again

## Phased Task Plan

### Phase 1: Lock the product boundary

Tasks:

1. Confirm that this service is a notification sender, not a notification platform. Yes
2. Confirm that `user_id` will be removed from the core model. Yes
3. Confirm that `idempotency_key` will be used for server-side deduplication. Yes

Deliverable:
- agreed product boundary and API direction

Tradeoff:
- early constraints reduce rework later

Likely pitfall:
- leaving the boundary vague and reintroducing platform features by accident

### Phase 2: Redesign the request and job models

Tasks:

1. Replace `user_id` in the REST payload.
2. Replace `user_id` in the gRPC payload if gRPC is retained.
3. Add `idempotency_key` to the request model.
4. Update `NotificationJob` to carry explicit recipient data.

Likely files:
- `internal/handlers/handler.go`
- `internal/grpc/grpc.go`
- `internal/types/notification.go`
- `proto/notifications.proto`

Tradeoff:
- aligns the public API with actual delivery behavior

Likely pitfall:
- updating only the public API and forgetting the queue payload contract

### Phase 3: Replace the schema

Tasks:

1. Add or replace tables for `service_channel_configs`, `notifications`, and `delivery_attempts`.
2. Remove or deprecate `users_preferences`, `push_subscriptions`, and `in_app_notifications`.
3. Remove `user_id` from persisted notification records.
4. Add a uniqueness rule for `(service_id, idempotency_key)`.

Likely files:
- `migrations/00001_init.sql` or a new migration
- `internal/db/queries/queries.sql`

Tradeoff:
- gives the service a coherent persistence model

Likely pitfall:
- partially keeping old user-centric tables and continuing to rely on them in code

### Phase 4: Refactor the notification manager

Tasks:

1. Stop using user-based preferences and fallback logic.
2. Validate requested channels against explicit recipient data.
3. Persist one notification record.
4. Create one delivery attempt per channel.

Likely files:
- `internal/notifications/manager.go`

Tradeoff:
- the system becomes explicit and predictable

Likely pitfall:
- keeping hidden fallback behavior in code even though recipient data is now explicit

### Phase 5: Refactor channels to use explicit destinations

Tasks:

1. Email channel must use `recipient.email`.
2. SMS channel must use `recipient.phone_number`.
3. Push channel must use request-provided push destinations.

Likely files:
- `internal/channels/email.go`
- `internal/channels/sms.go`
- `internal/channels/push.go`

Tradeoff:
- channel implementations become simpler and correct

Likely pitfall:
- assuming a channel can infer its destination from some shared identity value

### Phase 6: Add service-level channel config

Tasks:

1. Add data model for service channel enablement and config.
2. Enforce channel availability at send time.
3. Treat `config_json` as the medium-term source of truth.
4. Validate channel config JSON before persisting or using it.

Likely files:
- migrations
- sqlc queries
- CLI command files if setup is exposed there

Tradeoff:
- matches the intended product model well

Likely pitfall:
- trying to overbuild config management and secrets handling in the first pass

### Phase 7: Remove or defer in-app delivery

Tasks:

1. Remove WebSocket-based in-app delivery from MVP.
2. Remove in-app-specific persistence if it is no longer needed.
3. Keep only email, SMS, and push in the narrow service scope.

Likely files:
- `internal/ws/server.go`
- `internal/notifications/manager.go`
- `cmd/iwifunni/main.go`

Tradeoff:
- much narrower and more coherent MVP

Likely pitfall:
- keeping WebSocket because it already exists, even though it does not fit the product boundary

### Phase 8: Update docs and testing flows

Tasks:

1. Update README examples to use explicit recipients.
2. Update manual testing instructions.
3. Document transport strategy and channel requirements.

Likely files:
- `README.md`
- `.env.example`

Tradeoff:
- clearer onboarding and easier testing

Likely pitfall:
- stale docs making the refactor harder to validate than it actually is

## Immediate Next Changes Recommended For This Repo

1. Stop building new features around `user_id`.
2. Redesign the internal request and job model around explicit recipients.
3. Add `idempotency_key` to the request and persistence model.
4. Decide whether to keep `gRPC`; if uncertain, make `REST` primary and revisit `gRPC` later.
5. Add `delivery_attempts` before adding more channel logic.
6. Make `service_channel_configs.config_json` the medium-term config source of truth.
7. Remove user-based fallback logic from the notification manager.
8. Cut WebSocket/in-app from the MVP unless there is a clear business reason to keep it.

## Final Recommendation

For this repository and stated goal, the strongest path is:

1. `REST` as the primary public API
2. explicit recipients instead of `user_id`
3. `idempotency_key` for safe retries and server-side deduplication
4. service-owned channel configuration with `config_json` as the medium-term source of truth
5. `notifications` plus `delivery_attempts` as the persistence core
6. no user platform features in the MVP

This gives the project the smallest coherent shape for a notification sending service and reduces the risk of drifting into a much larger product accidentally.
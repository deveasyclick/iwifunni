# Workflow System Integration Design
## Notification Infrastructure Workflow Orchestration Layer

Version: v1  
Status: Implementation Design  
Architecture Style: Event-Driven + Queue-Orchestrated Runtime  
Runtime Strategy: Asynq + PostgreSQL  
Target Stack: Go

---

# 1. Overview

This document describes how to integrate a workflow orchestration system into the existing notification infrastructure.

The workflow layer enables:

- Event-triggered notification automation
- Delayed notifications
- Conditional routing
- Multi-step orchestration
- Workflow execution tracking
- Workflow versioning
- Future extensibility for advanced automation

This system is inspired by platforms like:

- Novu
- Knock
- Customer.io
- Courier
- Resend Workflows

---

# 2. Core Architectural Principle

The workflow engine MUST NOT send notifications directly.

Instead:

```text
Workflow Engine
    ↓
Notification Dispatcher
    ↓
Provider Registry
    ↓
Providers
```

The workflow system orchestrates execution.

The existing notification system remains responsible for delivery.

This preserves:

- provider abstraction
- multi-channel support
- retry behavior
- queue-based delivery
- delivery tracking
- webhook emission

---

# 3. High-Level Architecture

```text
Client / SDK
    ↓
POST /events
    ↓
Workflow Trigger Resolver
    ↓
Workflow Engine
    ↓
Workflow Execution Runtime
    ↓
Queue Jobs (Asynq)
    ↓
Workflow Step Workers
    ↓
Notification Dispatcher
    ↓
Provider Registry
    ↓
Providers
```

---

# 4. Architectural Goals

## Primary Goals

- Durable workflow execution
- Queue-based orchestration
- Horizontal scalability
- Multi-tenant isolation
- Extensible step system
- Minimal coupling with providers

## Non-Goals (v1)

The following are intentionally excluded from v1:

- loops
- arbitrary code execution
- embedded scripting
- visual expression builders
- workflow recursion
- distributed graph execution engines
- collaborative editing

---

# 5. Core Workflow Concepts

---

## 5.1 Workflow Definition

A workflow is a persisted graph definition.

A workflow contains:

- trigger
- nodes
- edges
- version
- metadata

---

## 5.2 Workflow Execution

A workflow execution is a runtime instance of a workflow triggered by an event.

Example:

```text
Workflow:
User Signup Welcome Flow

Executions:
exec_1
exec_2
exec_3
```

Each execution maintains independent state.

---

## 5.3 Workflow Step

A step is a node in the workflow graph.

Supported v1 step types:

- trigger
- notification
- delay
- condition
- webhook

---

## 5.4 Runtime State

Workflow runtime state tracks:

- current execution state
- completed steps
- failed steps
- retries
- timestamps
- execution metadata

State MUST be persisted in PostgreSQL.

---

# 6. Directory Structure

Add the following modules:

```text
/internal

  /workflow
    handler.go
    service.go
    repository.go
    engine.go
    executor.go
    runtime.go
    validator.go
    models.go

  /workflow_steps
    notification.go
    delay.go
    condition.go
    webhook.go

  /workflow_runtime
    scheduler.go
    state_store.go
```

---

# 7. Database Schema

---

## 7.1 workflows

Stores workflow definitions.

```sql
CREATE TABLE workflows (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL,

    name TEXT NOT NULL,

    status TEXT NOT NULL DEFAULT 'draft',

    version INTEGER NOT NULL DEFAULT 1,

    trigger_event TEXT NOT NULL,

    definition_json JSONB NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

## 7.2 workflow_executions

Stores runtime execution instances.

```sql
CREATE TABLE workflow_executions (
    id UUID PRIMARY KEY,

    workflow_id UUID NOT NULL,
    project_id UUID NOT NULL,

    subscriber_id TEXT,

    status TEXT NOT NULL,

    current_step_id TEXT,

    trigger_payload JSONB,

    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP,
    failed_at TIMESTAMP
);
```

---

## 7.3 workflow_step_executions

Stores per-step execution state.

```sql
CREATE TABLE workflow_step_executions (
    id UUID PRIMARY KEY,

    execution_id UUID NOT NULL,

    step_id TEXT NOT NULL,

    step_type TEXT NOT NULL,

    status TEXT NOT NULL,

    attempts INTEGER NOT NULL DEFAULT 0,

    input_json JSONB,
    output_json JSONB,
    error_json JSONB,

    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    failed_at TIMESTAMP
);
```

---

# 8. Workflow Definition Format

---

## 8.1 Example Workflow JSON

```json
{
  "id": "welcome_flow",

  "trigger": {
    "event": "user.signup"
  },

  "nodes": [
    {
      "id": "delay_1",
      "type": "delay",
      "config": {
        "duration": "5m"
      }
    },

    {
      "id": "email_1",
      "type": "notification",
      "config": {
        "template_id": "welcome_email",
        "channels": ["email"]
      }
    }
  ],

  "edges": [
    {
      "source": "delay_1",
      "target": "email_1"
    }
  ]
}
```

---

# 9. Event System

---

## 9.1 New API Endpoint

Add:

```text
POST /events
```

Purpose:

- trigger workflows
- decouple workflows from direct notification APIs

---

## 9.2 Event Payload

```json
{
  "event": "user.signup",

  "subscriber_id": "sub_123",

  "data": {
    "email": "john@example.com",
    "name": "John"
  }
}
```

---

# 10. Workflow Trigger Resolution

---

## 10.1 Trigger Resolution Flow

```text
POST /events
    ↓
Resolve project_id
    ↓
Find active workflows
WHERE trigger_event = incoming_event
    ↓
Create workflow execution
    ↓
Enqueue first step
```

---

# 11. Queue-Orchestrated Runtime

## IMPORTANT DESIGN RULE

The workflow engine MUST NOT recursively execute workflows in memory.

BAD:

```go
execute(step1)
execute(step2)
execute(step3)
```

This breaks:

- durability
- retries
- crash recovery
- horizontal scaling

---

## CORRECT APPROACH

Every workflow step MUST execute as an independent queue job.

```text
Workflow Execution
    ↓
Enqueue Step Job
    ↓
Worker Executes Step
    ↓
Persist State
    ↓
Enqueue Next Steps
```

---

# 12. Asynq Job Types

---

## 12.1 Workflow Step Job

```go
const (
    JobWorkflowStep = "workflow:step"
)
```

---

## 12.2 Job Payload

```go
type WorkflowStepJob struct {
    ExecutionID string
    WorkflowID  string
    StepID      string
}
```

---

# 13. Workflow Engine

---

## 13.1 Responsibilities

The workflow engine is responsible for:

- loading workflow definitions
- evaluating conditions
- scheduling delayed steps
- managing execution state
- traversing workflow graphs
- enqueueing next steps

The engine MUST NOT:
- send providers directly
- contain channel-specific logic

---

## 13.2 Engine Structure

```go
type Engine struct {
    workflows WorkflowRepository

    queue Queue

    dispatcher notification.Dispatcher

    runtime RuntimeStore
}
```

---

# 14. Step Execution Model

---

# 14.1 Notification Step

Notification steps delegate to the existing notification dispatcher.

Example:

```go
func (e *Engine) executeNotificationStep(
    ctx context.Context,
    step WorkflowStep,
    runtime RuntimeContext,
) error {

    req := notification.SendRequest{
        ProjectID: runtime.ProjectID,
        SubscriberID: runtime.SubscriberID,

        TemplateID: step.Config.TemplateID,

        Channels: step.Config.Channels,

        Metadata: runtime.Payload,
    }

    return e.dispatcher.Dispatch(ctx, req)
}
```

---

# 14.2 Delay Step

Delay steps enqueue future jobs.

Example:

```go
func (e *Engine) executeDelayStep(
    ctx context.Context,
    duration time.Duration,
    payload WorkflowStepJob,
) error {

    return e.queue.EnqueueIn(
        JobWorkflowStep,
        payload,
        duration,
    )
}
```

---

# 14.3 Condition Step

Condition steps evaluate runtime payload data.

Example:

```json
{
  "type": "condition",
  "config": {
    "field": "user.plan",
    "operator": "equals",
    "value": "pro"
  }
}
```

Execution:

```go
if payload.User.Plan == "pro" {
    next("email_step")
}
```

---

# 15. Workflow Graph Traversal

The workflow engine traverses edges.

Example:

```text
trigger
   ↓
condition
 ┌───┴────┐
yes      no
 ↓        ↓
email    sms
```

Traversal rules:

- completed step → resolve outgoing edges
- enqueue downstream nodes
- condition nodes select branch targets

---

# 16. Runtime Persistence

Runtime state MUST be updated after every step.

Example lifecycle:

```text
queued
running
completed
failed
retrying
```

This enables:

- observability
- retries
- recovery
- debugging

---

# 17. Failure Handling

---

## 17.1 Step-Level Failures

Failures should be isolated to individual steps.

Workflow execution should not fail globally unless:

- retry limit exceeded
- fatal condition encountered

---

## 17.2 Retry Strategy

Retries should use Asynq retry policies.

Example:

```go
asynq.MaxRetry(10)
```

---

# 18. Workflow Versioning

Workflows MUST be immutable once published.

Updates create new versions.

Example:

```text
welcome_flow:v1
welcome_flow:v2
welcome_flow:v3
```

Existing executions continue using the original version.

---

# 19. Workflow Status

Supported workflow statuses:

```text
draft
active
paused
archived
```

Only ACTIVE workflows can execute.

---

# 20. Multi-Tenant Isolation

All workflow resources MUST be scoped by:

```text
project_id
```

Including:

- workflows
- executions
- runtime state
- step executions

Workflow queries MUST NEVER cross tenant boundaries.

---

# 21. Subscriber Model

Long-running workflows require persistent subscriber identities.

Add:

```text
subscribers
```

Recommended schema:

```sql
CREATE TABLE subscribers (
    id UUID PRIMARY KEY,

    project_id UUID NOT NULL,

    email TEXT,
    phone_number TEXT,

    metadata JSONB,

    created_at TIMESTAMP DEFAULT NOW()
);
```

---

# 22. Integration with Existing Notification System

The workflow system integrates with:

```text
/internal/notification/dispatcher.go
```

This becomes the single notification execution layer.

The workflow system MUST NOT bypass the dispatcher.

Benefits:

- centralized delivery logic
- provider abstraction reuse
- existing webhook support
- existing retry behavior
- existing status tracking

---

# 23. Workflow API Endpoints

---

## 23.1 Create Workflow

```text
POST /workflows
```

---

## 23.2 Get Workflow

```text
GET /workflows/:id
```

---

## 23.3 Publish Workflow

```text
POST /workflows/:id/publish
```

---

## 23.4 Trigger Event

```text
POST /events
```

---

## 23.5 Get Execution

```text
GET /workflow-executions/:id
```

---

# 24. Frontend Workflow Builder

The frontend workflow builder is a separate concern.

Recommended stack:

- React
- React Flow
- Zustand
- Tailwind

The UI edits workflow JSON only.

The backend never depends on React Flow.

---

# 25. Recommended MVP Scope

Start with only:

- trigger
- notification
- delay
- condition

Avoid:

- loops
- custom scripts
- AI generation
- nested workflows
- expression builders

---

# 26. Recommended Execution Flow Example

Example:

```text
Event:
user.signup

Workflow:
Trigger
  ↓
Delay (5m)
  ↓
Send Welcome Email
```

Runtime:

```text
POST /events
    ↓
Create execution
    ↓
Enqueue delay step
    ↓
Delay expires
    ↓
Enqueue notification step
    ↓
Dispatcher sends email
    ↓
Execution completed
```

---

# 27. Future Extensions

Planned future capabilities:

- workflow analytics
- A/B testing
- event streaming
- workflow templates
- delivery optimization
- branching UI
- retry policies per step
- dead-letter queues
- scheduled workflows
- audience segmentation

---

# 28. Final Architectural Principle

The workflow system is NOT a replacement for the notification system.

The workflow system is an orchestration layer above the notification infrastructure.

Final architecture:

```text
Workflow Engine
    ↓
Notification Dispatcher
    ↓
Provider Registry
    ↓
Providers
```

This separation is critical for maintainability, extensibility, and long-term scalability.
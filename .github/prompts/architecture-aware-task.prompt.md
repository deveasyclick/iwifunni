---
description: "Plan, implement, or review an Iwifunni task with explicit architecture checks before editing. Use for backend changes, frontend work, bug fixes, and documentation updates that must follow the repo's layering and auth rules."
name: "Iwifunni Architecture-Aware Task"
argument-hint: "Describe the task, affected area, and any constraints"
agent: "agent"
---

Handle the requested Iwifunni task using the repo instructions and the current implementation.

Before editing:

1. Name the owning layer or boundary first, such as router, middleware, handler, service, repository, frontend route, shared API client, or docs.
2. State the architecture constraints that apply to this task before proposing changes.
3. List the most likely files to inspect or edit and explain why each file belongs to the change.
4. Call out any likely doc-versus-code drift that could affect the task.
5. Define the smallest validation that could prove the change is correct.

While working:

- Keep handlers thin, keep orchestration in services, and keep persistence in repositories.
- Preserve the auth split between dashboard JWT routes, project API keys, and legacy service API keys unless the task explicitly changes that behavior.
- Route notification delivery and provider behavior through the existing queue, service, and registry flow.
- Reuse the shared frontend backend-proxy pattern instead of inventing one-off fetch logic.
- If the task spans docs and code, update both so the documented behavior matches the implementation.

When finished:

1. Summarize what changed.
2. State what validation was run.
3. Call out any remaining mismatch, follow-up step, or risk.
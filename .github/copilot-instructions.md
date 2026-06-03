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

## Workflow Builder Frontend Conventions

The workflow builder lives in `web/src/app/dashboard/components/workflows/`. It follows a strict domain-separated structure:

### Module layout

```
workflows/
├── api.ts                    # API client — all backend calls go through here
├── constants/                # App-wide constants (zeroUUID, patterns, sizes)
├── schema/                   # Zod validation schemas
├── draft/                    # Draft domain — pure data & logic (create, normalize, convert)
├── store/builder/            # Zustand store — store, actions, selectors
├── types/                    # All shared type definitions, organized by domain
│   ├── draft.ts              # BuilderNodeDraft, WorkflowBuilderDraft, etc.
│   ├── canvas.ts             # WorkflowCanvasNode, WorkflowCanvasEdge, etc.
│   ├── actions.ts            # AddConnectedNodeOptions, action types
│   ├── store.ts              # WorkflowBuilderStoreState
│   ├── duration.ts           # DelayUnit
│   ├── api.ts                # WorkflowEventPayload, TemplateUpdatePayload
│   └── ui.ts                 # All component prop types (*Props)
├── hooks/                    # Custom React hooks — all stateful logic
│   ├── use-channel-config.ts
│   ├── use-workflow-list.ts
│   └── use-workflow-create.ts
├── editors/                  # Rich text / email editor components
│   ├── blocks/               # Block factories and definitions
│   ├── encode.ts             # Body encoding/decoding
│   └── react-email-editor.tsx
├── utils/                    # Pure utility functions
│   ├── canvas/               # Canvas factories, graph builder, dagre layout
│   ├── display/              # Node name, description, subtitle, meta, tone, channel labels
│   ├── duration/             # Parse + format delay durations
│   ├── validation/           # Trigger, nodes, edges validators
│   ├── urls.ts               # URL builder helpers
│   └── search-params.ts      # Search param parsing helpers
├── components/               # Page-level sub-components (dialogs, panels)
│   ├── channel-editor-panel.tsx
│   ├── channel-preview-panel.tsx
│   └── delete-workflow-dialog.tsx
├── configure-workflow-channel.tsx
├── create-workflow.tsx
├── create-workflow-builder.tsx
└── WorkflowManagement.tsx    # Workflow list page
```

### Rules

- **All types go in `types/`.** Do not define prop types (`*Props`) or domain types inside component files. Every shared type belongs in one of the `types/*.ts` files organized by domain.
- **Component files are pure UI.** Page-level components (`create-workflow.tsx`, `WorkflowManagement.tsx`, etc.) must not contain business logic, inline API calls, or complex state management. Extract those into `hooks/`.
- **Business logic goes in `hooks/`.** Any component logic beyond simple UI state (data fetching, form submission, autosave, CRUD operations) must be extracted into a custom hook in `hooks/`.
- **Dialogs and overlays go in `components/`.** Do not inline `Dialog`, `Sheet`, or other overlay components inside parent components. Extract them into separate component files under `components/`.
- **Constants go in `constants/`.** Do not scatter literal constants across files. All shared constants (UUID patterns, sizes, channel lists, etc.) belong in `constants/index.ts`.
- **Zod schemas go in `schema/`.** Do not define validation schemas inside component or utility files. Place them in `schema/` and import where needed.
- **No god utility files.** Split utilities by domain into sub-directories under `utils/` (e.g., `utils/canvas/`, `utils/duration/`, `utils/display/`, `utils/validation/`). A single file should not mix duration parsing, canvas layout, node display, and draft conversion logic.
- **No empty re-export barrels.** Do not create files that only re-export from another module. Import directly from the source file.
- **No `.tsx` without JSX.** Files that contain no JSX must be `.ts`, not `.tsx`. Utility functions, pure business logic, and type definitions are `.ts`.
- **Store actions are separated.** The Zustand store in `store/builder/` has three files: `store.ts` (store creation), `actions.ts` (pure action factories), and `selectors.ts` (derived computations). Keep them separated, not inlined into the store.
- **Draft logic is separated.** All draft creation, normalization, and conversion logic belongs in `draft/`, not in utility files or components.

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
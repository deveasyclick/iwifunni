# Workflow Definition Builder

**File:** `web/src/app/dashboard/components/workflows/definition-builder/`  
**Tech:** React, React Flow (XY Flow), Zustand, Dagre, TypeScript  
**Status:** Active (frontend-only)

---

## 1. Overview

The Workflow Definition Builder is the visual canvas where users construct notification workflows. It is a **frontend-only abstraction** that manages a **builder draft** — a mutable JSON shape — and renders it as an interactive directed acyclic graph (DAG) using React Flow. The builder converts that draft into the backend `WorkflowDefinition` JSON on save.

The pipeline is:

```
WorkflowBuilderDraft  ──►  WorkflowDefinition  ──►  Backend API (persisted)
       ▲
       └──  (loaded from API via builderDraftFromDefinition)
```

The builder lives entirely in the `web` package and has no backend dependency. The backend never imports React Flow or any builder-specific type.

---

## 2. Core Types

All types are defined in `definition-builder/types.ts`.

### 2.1 Builder Draft (`WorkflowBuilderDraft`)

This is the source-of-truth frontend model that the user edits through the canvas and inspector.

```typescript
type WorkflowBuilderDraft = {
  triggerEvent: string;       // e.g. "user.signup"
  nodes: BuilderNodeDraft[];
  edges: BuilderEdgeDraft[];
};
```

### 2.2 Node Draft (`BuilderNodeDraft`)

Each step in the workflow is represented by a node draft. Every field is always present (empty string / placeholder for irrelevant types) so the model stays uniform.

```typescript
type BuilderNodeDraft = {
  id: string;
  name: string;
  type: "trigger" | "notification" | "delay" | "condition";
  duration: string;       // Go duration syntax: "5m", "1h30m" (only for delay)
  templateId: string;     // UUID or zeroUUID (only for notification)
  channel: WorkflowChannel | "";  // "email" | "sms" | "push" | ""
  field: string;          // Condition field path (only for condition)
  operator: string;       // Comparison operator (only for condition)
  value: string;          // Comparison value (only for condition)
};
```

**Node type reference:**

| Type           | Key fields                          | Purpose                                  |
| -------------- | ----------------------------------- | ---------------------------------------- |
| `trigger`      | —                                   | Entry point; starts the workflow on event |
| `delay`        | `duration`                          | Pauses for a fixed time before next step  |
| `notification` | `templateId`, `channel`             | Sends a message through a provider        |
| `condition`    | `field`, `operator`, `value`        | Legacy branching step (deprecated)        |

Once a node draft is created, `normalizeNodeDraftForType()` zeroes out fields irrelevant to the node's type, ensuring clean state after type changes.

### 2.3 Edge Draft (`BuilderEdgeDraft`)

Edges define the directed flow between nodes.

```typescript
type BuilderEdgeDraft = {
  source: string;
  target: string;
  branch: string;   // Empty in linear workflows; reserved for future branching
};
```

---

## 3. Canvas Graph Model

The canvas wraps raw drafts into React Flow nodes and edges with positioning, rendering metadata, and action callbacks.

### 3.1 Canvas Node (`WorkflowCanvasNode`)

```typescript
type WorkflowCanvasNode = FlowNode<WorkflowCanvasNodeData, "workflow-step">;

type WorkflowCanvasNodeData = {
  draft: BuilderNodeDraft;
  triggerEvent?: string;
  onEditNode?: (nodeId: string) => void;
  onRemoveNode?: (nodeId: string) => void;
  onDuplicateNode?: (nodeId: string) => void;
  canDelete?: boolean;
  canDuplicate?: boolean;
  nodeIssues?: WorkflowDefinitionIssue[];
};
```

Built by `buildCanvasNode()` in `utils.ts`. Each canvas node receives a freshly generated `canvas_*` ID separate from the draft ID, allowing React Flow to manage selection and layout independently.

### 3.2 Canvas Edge (`WorkflowCanvasEdge`)

```typescript
type WorkflowCanvasEdge = FlowEdge<WorkflowCanvasEdgeData, "workflow-edge">;

type WorkflowCanvasEdgeData = {
  branch: string;
  onInsertNode?: InsertNodeOnEdgeAction;
  isTerminal?: boolean;  // Dangling edge at the end of the flow
};
```

Built by `buildCanvasEdge()` in `utils.ts`. In addition to real edges (connecting two nodes), the canvas also renders a **terminal edge** (`isTerminal: true`) from the last node to itself. This terminal edge displays the same "+" button as real edges, letting users append a new step at the end of the workflow.

### 3.3 Initial Graph Construction

When the builder mounts with a draft, `buildCanvasGraphFromDraft()` in `utils/buildCanvasGraphFromDraft.tsx`:

1. Maps each `BuilderNodeDraft` to a `WorkflowCanvasNode` via `buildCanvasNode()`.
2. Maintains a `draftId → canvasNodeId` mapping so the graph can connect nodes correctly even after re-import.
3. Maps each `BuilderEdgeDraft` to a `WorkflowCanvasEdge` via `buildCanvasEdge()`, skipping edges whose source or target node is missing.
4. Passes the assembled arrays through `layoutCanvasGraph()` for positioning.

### 3.4 Conditional Graph Traversal in the Backend

On the Go side, the backend traverses the `Definition.Nodes` and `Definition.Edges` arrays to execute workflows. The traversal logic lives in `internal/workflow/runtime.go`:

```go
type Definition struct {
    Nodes []Node `json:"nodes"`
    Edges []Edge `json:"edges"`
}
```

The runtime finds next nodes by scanning edges whose source matches the current node ID:

```go
func nextNodeIDs(definition Definition, currentNodeID, branch string) []string
```

For **condition** nodes, it evaluates the branch expression and selects the edge whose `branch` field matches, enabling conditional routing. For all other node types, it follows edges with an empty branch.

---

## 4. Layer Overview

### 4.1 Component Architecture

```
WorkflowDefinitionBuilder          (index.tsx — top-level component)
├── WorkflowBuilderCanvas          (canvas.tsx — React Flow wrapper)
│   ├── WorkflowCanvasNodeComponent (canvas-node.tsx — custom node renderer)
│   └── WorkflowCanvasEdgeComponent (canvas-edge.tsx — custom edge with "+" button)
│       └── WorkflowStepActionMenu  (action-menu.tsx — popover to pick next step type)
└── WorkflowDefinitionInspector    (inspector.tsx — node/edge property panel)
```

### 4.2 Data Flow

```
Parent component (CreateWorkflowBuilder)
  │
  │  provides value (WorkflowBuilderDraft) + onChange
  ▼
WorkflowDefinitionBuilder
  │
  │  creates Zustand store from draft
  ▼
useWorkflowBuilder (hook)
  │
  │  syncs store state ↔ canvas nodes/edges
  │  debounces draft → onChange callback
  ▼
Parent component receives updated draft,
saves to backend via API (700ms debounced autosave)
```

### 4.3 Key Pipeline

```
         [User edits canvas]
                │
                ▼
   Store action mutates canvas nodes/edges
                │
                ▼
   useWorkflowBuilder::buildDraftFromCanvas()
          converts canvas → WorkflowBuilderDraft
                │
                ▼
   onChange(draft) → parent updates state
                │
                ▼
   workflowDefinitionFromBuilderDraft(draft)
          converts draft → WorkflowDefinition
                │
                ▼
   Backend API (autosave)
```

---

## 5. Definition Conversion

### 5.1 Draft → Backend Definition

`workflowDefinitionFromBuilderDraft()` in `utils.ts` transforms the flat builder model into the backend `WorkflowDefinition` JSON that gets persisted.

**Mapping rules by node type:**

| Draft field              | Backend location                                      |
| ------------------------ | ----------------------------------------------------- |
| `trigger` node           | `{ id, type: "trigger", config: { name? } }`         |
| `delay` node             | `{ id, type: "delay", config: { name?, duration } }` |
| `notification` node      | `{ id, type: "notification", config: { name?, template_id, channels[] } }` |
| `condition` node         | `{ id, type: "condition", config: { name?, field, operator, value } }` |
| `draft.triggerEvent`     | `definition.trigger.event`                             |
| `draft.edges[].source`   | `definition.edges[].source`                            |
| `draft.edges[].target`   | `definition.edges[].target`                            |
| `draft.edges[].branch`   | `definition.edges[].branch` (omitted if empty)         |

```typescript
// Example result:
{
  trigger: { event: "user.signup" },
  nodes: [
    { id: "trigger_1", type: "trigger" },
    { id: "delay_1",   type: "delay",   config: { name: "Wait 5 minutes", duration: "5m" } },
    { id: "email_1",   type: "notification", config: { name: "Send welcome email", template_id: "uuid", channels: ["email"] } },
  ],
  edges: [
    { source: "trigger_1", target: "delay_1" },
    { source: "delay_1",   target: "email_1" },
  ],
}
```

### 5.2 Backend Definition → Draft

`builderDraftFromDefinition()` in `utils.ts` reverses the transformation when loading a persisted workflow from the backend. It also ensures:

- A trigger node always exists (inserts one if missing from the loaded definition).
- Template IDs are normalized: empty/unset values become `zeroUUID` (`00000000-0000-0000-0000-000000000000`).
- Each node is passed through `normalizeNodeDraftForType()` to guarantee consistent field shapes.

### 5.3 Default Draft

`createDefaultWorkflowBuilderDraft()` in `utils/createDefaultWorkflowBuilderDraft.ts` produces the starter template shown for new workflows:

```typescript
{
  triggerEvent: "user.signup",
  nodes: [
    { id: "trigger_1", type: "trigger",       name: "Test trigger" },
    { id: "delay_1",   type: "delay",         name: "Wait 5 minutes", duration: "5m" },
    { id: "email_1",   type: "notification",  name: "Send welcome email", templateId: zeroUUID, channel: "email" },
  ],
  edges: [
    { source: "trigger_1", target: "delay_1" },
    { source: "delay_1",   target: "email_1" },
  ],
}
```

---

## 6. Store Operations

The builder store (`store.ts`) is a Zustand vanilla store that manages canvas nodes, edges, and selection state. Below are the key actions.

### 6.1 Adding a Connected Node

```typescript
addConnectedNode(sourceNodeId, type, options?)
```

Creates a new node draft, builds a canvas node and an edge from `sourceNodeId`, then runs `layoutCanvasGraph()` to auto-position the new graph. Selects the new node.

### 6.2 Inserting a Node on an Edge

```typescript
insertNodeOnEdge(edgeId, type, options?)
```

Splits an existing edge by:
1. Removing the clicked edge.
2. Creating two new edges: `originalSource → newNode` and `newNode → originalTarget`.
3. Running layout for the updated graph.

If `edgeId` is a terminal edge (`terminal:<nodeId>`), it inserts a new node after the source node without splitting.

### 6.3 Duplicating a Node

```typescript
duplicateNode(nodeId)
```

Copies the node draft with a fresh ID, inserts it immediately after the original (new edge from original to duplicate), and preserves any outgoing edges from the original that should continue after the duplicate.

### 6.4 Removing a Node

```typescript
removeNode(nodeId)
```

Removes the node and re-connects its predecessor to its successor (if exactly one incoming and one outgoing edge), preserving the linear flow. Falls back to a fresh trigger node if the canvas becomes empty.

### 6.5 Connecting Nodes

```typescript
connectNodes(connection: Connection)
```

Creates a new edge between two existing nodes via `addEdge` from React Flow.

### 6.6 Updating Node Draft

```typescript
updateNodeDraft(nodeId, updater: (draft) => nextDraft)
```

Applies a functional updater to the node's draft. The result is normalized through `normalizeNodeDraftForType()` to keep fields consistent with the node's type.

### 6.7 Removing an Edge

```typescript
removeEdge(edgeId)
```

Removes the edge from the canvas and deselects it if it was selected.

### 6.8 Auto Layout

```typescript
autoLayout()
```

Reruns `layoutCanvasGraph()` on the current nodes and edges to recalculate positions.

---

## 7. Layout Engine

Positioning is handled by **Dagre**, a JavaScript library that lays out directed graphs.

The `layoutCanvasGraph()` function in `utils.ts`:

1. Creates a Dagre graph with `rankdir: "TB"` (top-to-bottom), spacing constants (`nodesep: 40`, `ranksep: 34`), and margins.
2. Registers all nodes with fixed dimensions (`nodeWidth: 288`, `nodeHeight: 156` from `constants.ts`).
3. Registers all edges as directed connections.
4. Runs `dagre.layout(graph)`.
5. Maps Dagre-computed positions back to React Flow nodes, offsetting by half-width/height so positions become top-left corner coordinates (React Flow convention).

The layout is always run after structural graph changes (add, insert, duplicate, remove).

---

## 8. Validation

`validateWorkflowDefinitionDraft()` in `utils/validateWorkflowDefinitionDraft.tsx` checks the converted `WorkflowDefinition` and returns a list of `WorkflowDefinitionIssue` objects.

**Validation rules:**

| Rule                  | Field checked            | Error message                                    |
| --------------------- | ------------------------ | ------------------------------------------------ |
| Trigger event present | `trigger.event`          | Event required by backend API                    |
| At least one node     | `nodes`                  | One node required                                |
| Unique node IDs       | `nodes[].id`             | Duplicate ID                                     |
| Duration format       | `nodes[].duration`       | Must use Go duration syntax (e.g. `5m`, `1h30m`) |
| Template UUID         | `nodes[].template_id`    | Must be valid UUID or `zeroUUID`                 |
| Template configured   | `nodes[].template_id`    | No configured template                           |
| Single channel        | `nodes[].channels`       | Exactly one supported channel required           |
| No conditions         | `nodes[].type`           | Condition steps unsupported in linear builder    |
| Edge targets exist    | `edges[].source/target`  | Edges must point to existing nodes               |
| No branching          | `edges[].branch`         | Branching unsupported in linear builder          |
| Single start node     | `edges` topology         | Must have exactly one node with no incoming edges |
| Trigger first         | trigger node edges       | Trigger must have no incoming edges              |

Issues are surfaced in the inspector panel and the autosave state. When issues exist, autosave pauses and shows `"Fix definition issues to resume autosave"`.

---

## 9. Runtime Edge Types

While the frontend builder works with a single edge type (`"workflow-edge"`), the backend runtime in `internal/workflow/runtime.go` classifies edges with different semantics:

| Edge type   | Behavior                                                |
| ----------- | ------------------------------------------------------- |
| **Linear**  | No `branch` set. The engine follows the edge unconditionally after the step completes. |
| **Branch**  | `branch` is set. Only followed when the condition node evaluates to the matching branch value. |

The builder currently supports **linear workflows only** (no branching). Branch support is reserved for future condition-based routing when the frontend re-enables condition nodes.

---

## 10. Autosave Integration

`CreateWorkflowBuilder` in `create-workflow-builder.tsx` orchestrates the autosave flow:

1. **Loads** the workflow from the API on mount.
2. **Converts** the persisted `WorkflowDefinition` to a `WorkflowBuilderDraft` via `builderDraftFromDefinition()`.
3. **Syncs** the draft with the `WorkflowDefinitionBuilder` component.
4. **Debounces** (700ms) any draft change from the builder, converts it to `WorkflowDefinition` via `workflowDefinitionFromBuilderDraft()`, and calls the update API.
5. **Pauses autosave** when validation issues are present, resuming once resolved.
6. Tracks the last saved signature so unchanged drafts don't trigger unnecessary saves.

---

## 11. File Map

```
web/src/app/dashboard/components/workflows/
├── definition-builder/
│   ├── index.tsx                 # Exports WorkflowDefinitionBuilder component + conversion helpers
│   ├── types.ts                  # All builder types (drafts, canvas, store state, props)
│   ├── store.ts                  # Zustand store (canvas actions)
│   ├── use-workflow-builder.ts   # React hook syncing store ↔ parent component
│   ├── utils.ts                  # Draft↔definition conversion, layout, node normalization
│   ├── constants.ts              # nodeWidth, nodeHeight, UUID patterns, channels list
│   ├── canvas.tsx                # React Flow canvas wrapper (WorkflowBuilderCanvas)
│   ├── canvas-node.tsx           # Custom node renderer with action toolbar
│   ├── canvas-edge.tsx           # Custom edge renderer with "+" insert button
│   ├── action-menu.tsx           # Step-type picker popover
│   └── inspector.tsx             # Node/edge property panel
├── utils/
│   ├── createDefaultWorkflowBuilderDraft.ts  # Starter draft factory
│   ├── buildCanvasGraphFromDraft.tsx         # Initial graph construction from draft
│   ├── validateWorkflowDefinitionDraft.tsx   # Validation rules
│   ├── buildDefaultNodeName.ts              # Default name per node type
│   └── getNodeMeta.tsx                      # Icon, label, status per node type
├── create-workflow-builder.tsx   # Page-level orchestrator (load, autosave)
└── create-workflow.tsx           # New-workflow dialog (name → builder redirect)
```

---

## 12. Example: Full Round Trip

### 12.1 User creates a workflow

The default builder draft (section 5.3) renders a three-step flow:

```
[Trigger: user.signup] → [Delay: 5m] → [Email notification]
```

### 12.2 Draft JSON

```json
{
  "triggerEvent": "user.signup",
  "nodes": [
    { "id": "trigger_1", "name": "Test trigger", "type": "trigger", "duration": "5m", "templateId": "", "channel": "", "field": "data.plan", "operator": "equals", "value": "pro" },
    { "id": "delay_1", "name": "Wait 5 minutes", "type": "delay", "duration": "5m", "templateId": "", "channel": "", "field": "data.plan", "operator": "equals", "value": "pro" },
    { "id": "email_1", "name": "Send welcome email", "type": "notification", "duration": "5m", "templateId": "00000000-0000-0000-0000-000000000000", "channel": "email", "field": "data.plan", "operator": "equals", "value": "pro" }
  ],
  "edges": [
    { "source": "trigger_1", "target": "delay_1", "branch": "" },
    { "source": "delay_1", "target": "email_1", "branch": "" }
  ]
}
```

### 12.3 Converted Backend Definition

```json
{
  "trigger": { "event": "user.signup" },
  "nodes": [
    { "id": "trigger_1", "type": "trigger" },
    { "id": "delay_1", "type": "delay", "config": { "name": "Wait 5 minutes", "duration": "5m" } },
    { "id": "email_1", "type": "notification", "config": { "name": "Send welcome email", "template_id": "00000000-0000-0000-0000-000000000000", "channels": ["email"] } }
  ],
  "edges": [
    { "source": "trigger_1", "target": "delay_1" },
    { "source": "delay_1", "target": "email_1" }
  ]
}
```

### 12.4 Loaded back into the builder

`builderDraftFromDefinition()` reverses the transformation. The trigger node's `name` field (present in the persisted config) is restored. Empty/missing template IDs become `zeroUUID`. A trigger node is prepended if missing from the loaded data.

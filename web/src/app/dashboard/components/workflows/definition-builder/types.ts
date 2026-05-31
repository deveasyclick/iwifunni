import type {
  Connection,
  Edge as FlowEdge,
  EdgeChange,
  Node as FlowNode,
  NodeChange,
} from "@xyflow/react";
import type {
  WorkflowChannel,
  WorkflowDefinition,
  WorkflowEdge,
  WorkflowNode,
} from "@/app/types/workflow";

export type WorkflowNodeType = WorkflowNode["type"];

export type BuilderNodeDraft = {
  id: string;
  name: string;
  type: WorkflowNodeType;
  duration: string;
  templateId: string;
  channel: WorkflowChannel | "";
  field: string;
  operator: string;
  value: string;
};

export type DelayUnit = "seconds" | "minutes" | "hours" | "days" | "weeks";

export type BuilderEdgeDraft = {
  source: string;
  target: string;
  branch: string;
};

export type WorkflowBuilderDraft = {
  triggerEvent: string;
  nodes: BuilderNodeDraft[];
  edges: BuilderEdgeDraft[];
};

export type WorkflowDefinitionIssue = {
  path: string;
  message: string;
};

export type WorkflowDefinitionBuilderProps = {
  value: WorkflowBuilderDraft;
  onChange: (value: WorkflowBuilderDraft) => void;
  issues: WorkflowDefinitionIssue[];
  workflowSetup?: WorkflowSetupSummary;
  autosaveState?: WorkflowAutosaveState;
  onConfigureNotificationNode?: (nodeId: string) => void;
  onWorkflowSetupChange?: (
    values: Partial<Pick<WorkflowSetupSummary, "name" | "description">>,
  ) => void;
};

export type WorkflowSetupSummary = {
  workflowId: string;
  key: string;
  name: string;
  description: string;
};

export type WorkflowAutosaveState = {
  status: "loading" | "saving" | "saved" | "error" | "invalid";
  message: string;
};

export type AddConnectedNodeOptions = {
  channel?: WorkflowChannel;
  branch?: string;
};

export type AddConnectedNodeAction = (
  sourceNodeId: string,
  type: WorkflowNodeType,
  options?: AddConnectedNodeOptions,
) => void;

export type InsertNodeOnEdgeAction = (
  edgeId: string,
  type: WorkflowNodeType,
  options?: AddConnectedNodeOptions,
) => void;

export type WorkflowNodeAction = (nodeId: string) => void;

export type WorkflowCanvasNodeData = {
  draft: BuilderNodeDraft;
  triggerEvent?: string;
  onEditNode?: WorkflowNodeAction;
  onRemoveNode?: WorkflowNodeAction;
  onDuplicateNode?: WorkflowNodeAction;
  canDelete?: boolean;
  canDuplicate?: boolean;
};

export type WorkflowCanvasEdgeData = {
  branch: string;
  onInsertNode?: InsertNodeOnEdgeAction;
  isTerminal?: boolean;
};

export type WorkflowCanvasNode = FlowNode<
  WorkflowCanvasNodeData,
  "workflow-step"
>;
export type WorkflowCanvasEdge = FlowEdge<
  WorkflowCanvasEdgeData,
  "workflow-edge"
>;

export type WorkflowBuilderStoreState = {
  triggerEvent: string;
  nodes: WorkflowCanvasNode[];
  edges: WorkflowCanvasEdge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  setCanvasFromDraft: (draft: WorkflowBuilderDraft) => void;
  setTriggerEvent: (value: string) => void;
  addConnectedNode: (
    sourceNodeId: string,
    type: WorkflowNodeType,
    options?: AddConnectedNodeOptions,
  ) => void;
  insertNodeOnEdge: InsertNodeOnEdgeAction;
  updateNodeDraft: (
    nodeId: string,
    updater: (draft: BuilderNodeDraft) => BuilderNodeDraft,
  ) => void;
  duplicateNode: (nodeId: string) => void;
  removeNode: (nodeId: string) => void;
  onNodesChange: (changes: NodeChange<WorkflowCanvasNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<WorkflowCanvasEdge>[]) => void;
  connectNodes: (connection: Connection) => void;
  updateEdgeBranch: (edgeId: string, branch: string) => void;
  removeEdge: (edgeId: string) => void;
  setSelection: (selection: {
    nodeId?: string | null;
    edgeId?: string | null;
  }) => void;
  autoLayout: () => void;
};

export type WorkflowDefinitionModel = {
  definition?: WorkflowDefinition;
  edges: WorkflowEdge[];
};

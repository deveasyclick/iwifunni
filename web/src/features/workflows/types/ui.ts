import type { ReactNode } from 'react';
import type {
  Connection,
  EdgeChange,
  EdgeMouseHandler,
  NodeChange,
  NodeMouseHandler,
} from '@xyflow/react';
import type {
  BuilderNodeDraft,
  WorkflowBuilderDraft,
  WorkflowDefinitionIssue,
  WorkflowNodeType,
} from './draft';
import type { WorkflowCanvasNode, WorkflowCanvasEdge } from './canvas';
import type { AddConnectedNodeOptions } from './actions';
import type { WorkflowItem } from '@/app/types/workflow';

export type WorkflowDefinitionBuilderProps = {
  value: WorkflowBuilderDraft;
  onChange: (value: WorkflowBuilderDraft) => void;
  issues: WorkflowDefinitionIssue[];
  workflowSetup?: WorkflowSetupSummary;
  autosaveState?: WorkflowAutosaveState;
  onConfigureNotificationNode?: (nodeId: string, channel?: string) => void;
  onWorkflowSetupChange?: (
    values: Partial<Pick<WorkflowSetupSummary, 'name' | 'description'>>,
  ) => void;
};

export type WorkflowSetupSummary = {
  workflowId: string;
  key: string;
  name: string;
  description: string;
};

export type WorkflowAutosaveState = {
  status: 'loading' | 'saving' | 'saved' | 'error' | 'invalid';
  message: string;
};

export type WorkflowBuilderCanvasProps = {
  nodes: WorkflowCanvasNode[];
  edges: WorkflowCanvasEdge[];
  onNodesChange: (changes: NodeChange<WorkflowCanvasNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<WorkflowCanvasEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  onPaneClick: () => void;
  onNodeClick: NodeMouseHandler<WorkflowCanvasNode>;
  onEdgeClick: EdgeMouseHandler<WorkflowCanvasEdge>;
};

export type WorkflowStepActionMenuProps = {
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSelect: (type: WorkflowNodeType, options?: AddConnectedNodeOptions) => void;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'right' | 'bottom' | 'left';
  sideOffset?: number;
};

export type WorkflowDefinitionInspectorProps = {
  selectedNode: WorkflowCanvasNode | null;
  selectedEdge: WorkflowCanvasEdge | null;
  issues: WorkflowDefinitionIssue[];
  selectedNodeIssues: WorkflowDefinitionIssue[];
  selectedNodeIncoming: number;
  selectedNodeOutgoing: number;
  selectedEdgeSourceLabel: string;
  selectedEdgeTargetLabel: string;
  updateNodeDraft: (
    nodeId: string,
    updater: (draft: BuilderNodeDraft) => BuilderNodeDraft,
  ) => void;
  removeNode: (nodeId: string) => void;
  removeEdge: (edgeId: string) => void;
  workflowSetup?: WorkflowSetupSummary;
  autosaveState?: WorkflowAutosaveState;
  onConfigureNotificationNode?: (nodeId: string, channel?: string) => void;
  onWorkflowSetupChange?: (
    values: Partial<Pick<WorkflowSetupSummary, 'name' | 'description'>>,
  ) => void;
};

export type DelayConfigProps = {
  draft: BuilderNodeDraft;
  updateNodeDraft: (
    nodeId: string,
    updater: (draft: BuilderNodeDraft) => BuilderNodeDraft,
  ) => void;
};

export type NotificationConfigProps = {
  draft: BuilderNodeDraft;
  onConfigureNotificationNode?: (nodeId: string, channel?: string) => void;
};

export type EdgeInfoProps = {
  sourceLabel: string;
  targetLabel: string;
};

export type NodeIssuesProps = {
  issues: WorkflowDefinitionIssue[];
};

export type WorkflowSetupPanelProps = {
  workflowSetup?: WorkflowSetupSummary;
  autosaveState?: WorkflowAutosaveState;
  onWorkflowSetupChange?: (
    values: Partial<Pick<WorkflowSetupSummary, 'name' | 'description'>>,
  ) => void;
};

export type CreateWorkflowBuilderProps = {
  workflowId: string;
};

export type WorkflowTableBodyProps = {
  loading: boolean;
  visibleItems: WorkflowItem[];
  mutatingID: string | null;
  onRequestDelete: (item: WorkflowItem) => void;
};

export type ConfigureWorkflowChannelProps = {
  workflowId: string;
  nodeId: string;
};

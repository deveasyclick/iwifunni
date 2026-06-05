import type { Connection, EdgeChange, NodeChange } from '@xyflow/react';
import type {
  WorkflowDefinition,
  WorkflowEdge,
  WorkflowNode,
} from '@/app/types/workflow';
import type { BuilderNodeDraft, WorkflowBuilderDraft } from './draft';
import type { WorkflowCanvasNode, WorkflowCanvasEdge } from './canvas';
import type { AddConnectedNodeOptions } from './actions';

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
    type: WorkflowNode['type'],
    options?: AddConnectedNodeOptions,
  ) => void;
  insertNodeOnEdge: (
    edgeId: string,
    type: WorkflowNode['type'],
    options?: AddConnectedNodeOptions,
  ) => void;
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

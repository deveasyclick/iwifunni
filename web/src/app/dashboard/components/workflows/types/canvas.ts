import type { Edge as FlowEdge, Node as FlowNode } from '@xyflow/react';
import type { WorkflowNode } from '@/app/types/workflow';
import type { BuilderNodeDraft, WorkflowDefinitionIssue } from './draft';
import type { AddConnectedNodeOptions } from './actions';

export type WorkflowCanvasNodeData = {
  draft: BuilderNodeDraft;
  triggerEvent?: string;
  onEditNode?: (nodeId: string) => void;
  onRemoveNode?: (nodeId: string) => void;
  onDuplicateNode?: (nodeId: string) => void;
  canDelete?: boolean;
  canDuplicate?: boolean;
  nodeIssues?: WorkflowDefinitionIssue[];
};

export type WorkflowCanvasEdgeData = {
  branch: string;
  onInsertNode?: (
    edgeId: string,
    type: WorkflowNode['type'],
    options?: AddConnectedNodeOptions,
  ) => void;
  isTerminal?: boolean;
};

export type WorkflowCanvasNode = FlowNode<
  WorkflowCanvasNodeData,
  'workflow-step'
>;

export type WorkflowCanvasEdge = FlowEdge<
  WorkflowCanvasEdgeData,
  'workflow-edge'
>;

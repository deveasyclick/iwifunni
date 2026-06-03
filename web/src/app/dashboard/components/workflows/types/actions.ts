import type { WorkflowChannel, WorkflowNode } from '@/app/types/workflow';

export type AddConnectedNodeOptions = {
  channel?: WorkflowChannel;
  branch?: string;
};

export type InsertNodeOnEdgeAction = (
  edgeId: string,
  type: WorkflowNode['type'],
  options?: AddConnectedNodeOptions,
) => void;

export type WorkflowNodeAction = (nodeId: string) => void;

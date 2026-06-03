import type { WorkflowChannel, WorkflowNode } from '@/app/types/workflow';

export type WorkflowNodeType = WorkflowNode['type'];

export type BuilderNodeDraft = {
  id: string;
  name: string;
  type: WorkflowNodeType;
  duration: string;
  templateId: string;
  channel: WorkflowChannel | '';
  field: string;
  operator: string;
  value: string;
};

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

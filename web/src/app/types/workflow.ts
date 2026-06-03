export type WorkflowChannel = 'email' | 'sms' | 'push';

export interface WorkflowTrigger {
  event: string;
}

export interface WorkflowNode {
  id: string;
  type: 'trigger' | 'notification' | 'delay' | 'condition';
  config?: Record<string, unknown>;
}

export interface WorkflowEdge {
  source: string;
  target: string;
  branch?: string;
}

export interface WorkflowDefinition {
  trigger: WorkflowTrigger;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface WorkflowItem {
  id: string;
  key: string;
  name: string;
  description?: string;
  channels?: WorkflowChannel[];
  templateIds?: Partial<Record<WorkflowChannel, string>>;
  isActive: boolean;
  status?: string;
  version?: number;
  triggerEvent?: string;
  definition?: WorkflowDefinition;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkflowPayload {
  key: string;
  name: string;
  description?: string;
  channels?: WorkflowChannel[];
  templateIds?: Partial<Record<WorkflowChannel, string>>;
  definition?: WorkflowDefinition;
}

export interface WorkflowExecutionItem {
  id: string;
  workflowId: string;
  subscriberId?: string;
  status: string;
  currentStepId?: string;
  triggerPayload?: Record<string, unknown>;
  startedAt: string;
  completedAt?: string;
  failedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowStepExecutionItem {
  id: string;
  executionId: string;
  stepId: string;
  stepType: string;
  status: string;
  attempts: number;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: Record<string, unknown>;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowExecutionDetail extends WorkflowExecutionItem {
  steps: WorkflowStepExecutionItem[];
}

export interface TriggerWorkflowEventPayload {
  event: string;
  subscriber_id?: string;
  data?: Record<string, unknown>;
}

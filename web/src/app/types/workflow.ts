export type WorkflowChannel = "email" | "sms" | "push";

export interface WorkflowItem {
  id: string;
  key: string;
  name: string;
  description?: string;
  channels: WorkflowChannel[];
  templateIds: Partial<Record<WorkflowChannel, string>>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkflowPayload {
  key: string;
  name: string;
  description?: string;
  channels: WorkflowChannel[];
  templateIds?: Partial<Record<WorkflowChannel, string>>;
}
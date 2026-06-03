import type {
  WorkflowBuilderDraft,
  WorkflowDefinitionIssue,
} from '@/app/dashboard/components/workflows/types/draft';

// ─── Component-specific types ───────────────────────────────────────────────

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

import type { WorkflowChannel, WorkflowNode } from '@/app/types/workflow';
import type {
  BuilderNodeDraft,
  WorkflowNodeType,
} from '@/features/workflows/types/draft';

export const buildDefaultNodeName = (
  type: WorkflowNodeType,
  channel?: WorkflowChannel | '',
) => {
  switch (type) {
    case 'trigger':
      return 'Test trigger';
    case 'delay':
      return 'Delay step';
    case 'condition':
      return 'Condition step';
    case 'notification':
      switch (channel) {
        case 'sms':
          return 'SMS notification';
        case 'push':
          return 'Push notification';
        default:
          return 'Email notification';
      }
    default:
      return 'Workflow step';
  }
};

export const getNodeDisplayName = (draft: BuilderNodeDraft) =>
  draft.name.trim() || buildDefaultNodeName(draft.type, draft.channel);

export const getNodeName = (
  node: WorkflowNode | null,
  fallbackNodeId: string,
) => {
  const config = node?.config || {};
  if (typeof config.name === 'string' && config.name.trim()) {
    return config.name.trim();
  }

  return node?.id || fallbackNodeId;
};

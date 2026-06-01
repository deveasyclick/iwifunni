import type { WorkflowChannel } from '@/app/types/workflow';
import type { WorkflowNodeType } from '../definition-builder/types';

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

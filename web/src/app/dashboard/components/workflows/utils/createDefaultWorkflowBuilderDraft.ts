import type {
  WorkflowNodeType,
  BuilderNodeDraft,
  WorkflowBuilderDraft,
} from '../definition-builder/types';
import type { WorkflowChannel } from '@/app/types/workflow';
import { zeroUUID } from '../definition-builder/constants';
import { buildDefaultNodeName } from './buildDefaultNodeName';

export const createNodeDraft = (
  type: WorkflowNodeType,
  channel?: WorkflowChannel,
): BuilderNodeDraft => {
  if (type === 'trigger') {
    return {
      id: 'trigger_1',
      name: buildDefaultNodeName(type),
      type,
      duration: '5m',
      templateId: '',
      channel: '',
      field: 'data.plan',
      operator: 'equals',
      value: 'pro',
    };
  }

  return {
    id:
      type === 'notification'
        ? `${channel || 'email'}_${Math.random().toString(36).slice(2, 6)}`
        : `${type}_${Math.random().toString(36).slice(2, 6)}`,
    name: buildDefaultNodeName(type, channel),
    type,
    duration: '5m',
    templateId: type === 'notification' ? zeroUUID : '',
    channel: type === 'notification' ? channel || 'email' : '',
    field: 'data.plan',
    operator: 'equals',
    value: 'pro',
  };
};

export const createDefaultWorkflowBuilderDraft = (): WorkflowBuilderDraft => ({
  triggerEvent: 'user.signup',
  nodes: [
    {
      ...createNodeDraft('trigger'),
      id: 'trigger_1',
      name: 'Test trigger',
    },
    {
      ...createNodeDraft('delay'),
      id: 'delay_1',
      name: 'Wait 5 minutes',
      duration: '5m',
    },
    {
      ...createNodeDraft('notification', 'email'),
      id: 'email_1',
      name: 'Send welcome email',
      templateId: zeroUUID,
      channel: 'email',
    },
  ],
  edges: [
    { source: 'trigger_1', target: 'delay_1', branch: '' },
    { source: 'delay_1', target: 'email_1', branch: '' },
  ],
});

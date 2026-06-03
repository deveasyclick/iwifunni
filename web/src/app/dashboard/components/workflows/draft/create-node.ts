import type { WorkflowChannel } from '@/app/types/workflow';
import type { BuilderNodeDraft, WorkflowNodeType } from '../types/draft';
import { buildDefaultNodeName } from '../utils/display/node-name';
import { zeroUUID } from '../constants';

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

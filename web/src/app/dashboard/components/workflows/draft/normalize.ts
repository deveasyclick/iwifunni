import { uuidPattern, zeroUUID } from '../utils/constants';
import type { BuilderNodeDraft, WorkflowNodeType } from './types';

export const normalizeImportedTemplateId = (value: unknown) => {
  const templateId = typeof value === 'string' ? value.trim() : '';

  if (!templateId) {
    return zeroUUID;
  }

  return uuidPattern.test(templateId) ? templateId : zeroUUID;
};

export const normalizeNodeDraftForType = (
  draft: BuilderNodeDraft,
  type: WorkflowNodeType = draft.type,
): BuilderNodeDraft => {
  if (type === 'trigger') {
    return {
      ...draft,
      name: draft.name,
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
    id: draft.id,
    name: draft.name,
    type,
    duration: type === 'delay' ? draft.duration : '5m',
    templateId: type === 'notification' ? draft.templateId || zeroUUID : '',
    channel: type === 'notification' ? draft.channel || 'email' : '',
    field: type === 'condition' ? draft.field || 'data.plan' : 'data.plan',
    operator: type === 'condition' ? draft.operator || 'equals' : 'equals',
    value: type === 'condition' ? draft.value : 'pro',
  };
};

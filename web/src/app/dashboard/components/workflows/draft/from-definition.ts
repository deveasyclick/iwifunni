import type { WorkflowChannel, WorkflowDefinition } from '@/app/types/workflow';
import type { WorkflowBuilderDraft } from '../types/draft';
import {
  normalizeNodeDraftForType,
  normalizeImportedTemplateId,
} from './normalize';
import { createNodeDraft } from './create-node';
import { buildDefaultNodeName } from '../utils/display/node-name';
import { createDefaultWorkflowBuilderDraft } from './create-default';

export const builderDraftFromDefinition = (
  definition?: WorkflowDefinition,
): WorkflowBuilderDraft => {
  if (!definition) {
    return createDefaultWorkflowBuilderDraft();
  }

  const draft: WorkflowBuilderDraft = {
    triggerEvent: definition.trigger?.event || '',
    nodes: definition.nodes.map((node) => {
      const config = node.config || {};
      const channel =
        Array.isArray(config.channels) && typeof config.channels[0] === 'string'
          ? (config.channels[0] as WorkflowChannel)
          : '';

      return normalizeNodeDraftForType(
        {
          id: node.id,
          name:
            typeof config.name === 'string' && config.name.trim()
              ? config.name.trim()
              : buildDefaultNodeName(node.type, channel),
          type: node.type,
          duration:
            typeof config.duration === 'string' ? config.duration : '5m',
          templateId: normalizeImportedTemplateId(config.template_id),
          channel,
          field: typeof config.field === 'string' ? config.field : 'data.plan',
          operator:
            typeof config.operator === 'string' ? config.operator : 'equals',
          value: typeof config.value === 'string' ? config.value : '',
        },
        node.type,
      );
    }),
    edges: definition.edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      branch: edge.branch || '',
    })),
  };

  const hasTriggerNode = draft.nodes.some((node) => node.type === 'trigger');
  if (!hasTriggerNode) {
    draft.nodes.unshift({ ...createNodeDraft('trigger'), id: 'trigger_1' });
    const firstNonTrigger = draft.nodes.find((node) => node.type !== 'trigger');
    if (firstNonTrigger) {
      draft.edges.unshift({
        source: 'trigger_1',
        target: firstNonTrigger.id,
        branch: '',
      });
    }
  }

  return draft;
};

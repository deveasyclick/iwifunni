import type {
  WorkflowDefinition,
  WorkflowNode,
  WorkflowEdge,
} from '@/app/types/workflow';
import type { WorkflowBuilderDraft } from '../types/draft';

export const workflowDefinitionFromBuilderDraft = (
  draft: WorkflowBuilderDraft,
): WorkflowDefinition => {
  const nodes: WorkflowNode[] = draft.nodes.map((node) => {
    const nodeName = node.name.trim();
    const namedConfig = nodeName ? { name: nodeName } : {};
    const base = {
      id: node.id.trim(),
      type: node.type,
    } as WorkflowNode;

    switch (node.type) {
      case 'trigger':
        return {
          ...base,
          config: Object.keys(namedConfig).length > 0 ? namedConfig : undefined,
        };
      case 'delay':
        return {
          ...base,
          config: {
            ...namedConfig,
            duration: node.duration.trim(),
          },
        };
      case 'notification':
        return {
          ...base,
          config: {
            ...namedConfig,
            template_id: node.templateId.trim(),
            channels: node.channel ? [node.channel] : [],
          },
        };
      case 'condition':
        return {
          ...base,
          config: {
            ...namedConfig,
            field: node.field.trim(),
            operator: node.operator.trim(),
            value: node.value.trim(),
          },
        };
      default:
        return {
          ...base,
          config: Object.keys(namedConfig).length > 0 ? namedConfig : undefined,
        };
    }
  });

  const edges: WorkflowEdge[] = draft.edges.map((edge) => ({
    source: edge.source.trim(),
    target: edge.target.trim(),
    branch: edge.branch.trim() || undefined,
  }));

  return {
    trigger: { event: draft.triggerEvent.trim() },
    nodes,
    edges,
  };
};

import dagre from '@dagrejs/dagre';
import type {
  WorkflowChannel,
  WorkflowDefinition,
  WorkflowEdge,
  WorkflowNode,
} from '@/app/types/workflow';
import {
  durationPattern,
  nodeHeight,
  nodeWidth,
  notificationChannels,
  uuidPattern,
  zeroUUID,
} from './constants';
import { buildDefaultNodeName } from '../utils/buildDefaultNodeName';
import type {
  BuilderNodeDraft,
  DelayUnit,
  WorkflowBuilderDraft,
  WorkflowCanvasEdge,
  WorkflowCanvasNode,
  WorkflowDefinitionIssue,
  WorkflowNodeType,
} from './types';
import {
  createDefaultWorkflowBuilderDraft,
  createNodeDraft,
} from '../utils/createDefaultWorkflowBuilderDraft';

export {
  createDefaultWorkflowBuilderDraft,
  createNodeDraft,
} from '../utils/createDefaultWorkflowBuilderDraft';

const createCanvasNodeId = () =>
  `canvas_${Math.random().toString(36).slice(2, 10)}`;
const createCanvasEdgeId = () =>
  `edge_${Math.random().toString(36).slice(2, 10)}`;

const formatDurationAmount = (value: number) => {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return String(Number(value.toFixed(2)));
};

export const getNodeDisplayName = (draft: BuilderNodeDraft) =>
  draft.name.trim() || buildDefaultNodeName(draft.type, draft.channel);

export const buildNodeDescription = (draft: BuilderNodeDraft) => {
  switch (draft.type) {
    case 'trigger':
      return 'Starts the workflow when you test or receive the trigger event.';
    case 'delay':
      return 'Waits for a fixed amount of time before the next step runs.';
    case 'notification':
      return 'Sends a channel message using the content configured for this step.';
    case 'condition':
      return 'Legacy branching step retained for compatibility.';
    default:
      return 'Configure the behavior for this workflow step.';
  }
};

export const hasConfiguredTemplateId = (templateId: string) => {
  const normalizedTemplateId = templateId.trim();

  return (
    normalizedTemplateId !== '' &&
    normalizedTemplateId !== zeroUUID &&
    uuidPattern.test(normalizedTemplateId)
  );
};

export const parseDelayDuration = (
  duration: string,
): { amount: string; unit: DelayUnit } => {
  const normalizedDuration = duration.trim();
  const match = normalizedDuration.match(/^(\d+(?:\.\d+)?)(s|m|h)$/);

  if (!match) {
    return {
      amount: normalizedDuration ? normalizedDuration : '',
      unit: 'minutes',
    };
  }

  const amount = Number(match[1]);
  const token = match[2];

  if (token === 'h') {
    if (amount >= 168 && amount % 168 === 0) {
      return { amount: formatDurationAmount(amount / 168), unit: 'weeks' };
    }
    if (amount >= 24 && amount % 24 === 0) {
      return { amount: formatDurationAmount(amount / 24), unit: 'days' };
    }
    return { amount: formatDurationAmount(amount), unit: 'hours' };
  }

  return {
    amount: formatDurationAmount(amount),
    unit: token === 's' ? 'seconds' : 'minutes',
  };
};

export const formatDelayDuration = (amount: string, unit: DelayUnit) => {
  const normalizedAmount = amount.trim();
  if (!normalizedAmount) {
    return '';
  }

  const numericAmount = Number(normalizedAmount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return normalizedAmount;
  }

  switch (unit) {
    case 'seconds':
      return `${formatDurationAmount(numericAmount)}s`;
    case 'minutes':
      return `${formatDurationAmount(numericAmount)}m`;
    case 'hours':
      return `${formatDurationAmount(numericAmount)}h`;
    case 'days':
      return `${formatDurationAmount(numericAmount * 24)}h`;
    case 'weeks':
      return `${formatDurationAmount(numericAmount * 168)}h`;
    default:
      return `${formatDurationAmount(numericAmount)}m`;
  }
};

const normalizeImportedTemplateId = (value: unknown) => {
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
          value: config.value == null ? '' : String(config.value),
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

export const getNodeTone = (type: WorkflowNodeType) => {
  switch (type) {
    case 'notification':
      return 'border-primary/40 bg-primary/8 text-primary';
    case 'delay':
      return 'border-warning/35 bg-warning/10 text-warningemphasis';
    case 'condition':
      return 'border-info/35 bg-info/10 text-infoemphasis';
    case 'trigger':
      return 'border-success/35 bg-success/10 text-successemphasis';
    default:
      return 'border-border bg-muted/40 text-foreground';
  }
};

export const buildNodeSubtitle = (
  draft: BuilderNodeDraft,
  triggerEvent: string,
) => {
  switch (draft.type) {
    case 'trigger':
      return triggerEvent
        ? `Event: ${triggerEvent}`
        : 'Configure workflow event';
    case 'delay':
      return draft.duration ? `Wait ${draft.duration}` : 'Configure delay';
    case 'notification':
      return hasConfiguredTemplateId(draft.templateId)
        ? `${draft.channel.toUpperCase()} content configured`
        : `${draft.channel.toUpperCase()} content needs configuration`;
    case 'condition':
      return 'Unsupported in linear workflows';
    default:
      return '';
  }
};

export const buildCanvasNode = (
  draft: BuilderNodeDraft,
  id = createCanvasNodeId(),
): WorkflowCanvasNode => ({
  id,
  type: 'workflow-step',
  position: { x: 0, y: 0 },
  data: { draft },
});

export const buildCanvasEdge = (
  source: string,
  target: string,
  branch = '',
  id = createCanvasEdgeId(),
): WorkflowCanvasEdge => ({
  id,
  source,
  target,
  sourceHandle: 'default',
  type: 'workflow-edge',
  data: { branch },
});

export const layoutCanvasGraph = (
  nodes: WorkflowCanvasNode[],
  edges: WorkflowCanvasEdge[],
) => {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: 'TB',
    nodesep: 40,
    ranksep: 34,
    marginx: 24,
    marginy: 24,
  });

  nodes.forEach((node) =>
    graph.setNode(node.id, { width: nodeWidth, height: nodeHeight }),
  );
  edges.forEach((edge) => graph.setEdge(edge.source, edge.target));
  dagre.layout(graph);

  return {
    nodes: nodes.map((node) => {
      const positioned = graph.node(node.id);
      return {
        ...node,
        position: positioned
          ? {
              x: positioned.x - nodeWidth / 2,
              y: positioned.y - nodeHeight / 2,
            }
          : node.position,
      };
    }),
    edges,
  };
};

export const buildDraftFromCanvas = (
  triggerEvent: string,
  nodes: WorkflowCanvasNode[],
  edges: WorkflowCanvasEdge[],
): WorkflowBuilderDraft => {
  const orderedNodes = [...nodes].sort((left, right) => {
    if (left.position.y !== right.position.y) {
      return left.position.y - right.position.y;
    }
    return left.position.x - right.position.x;
  });
  const nodeDraftById = new Map(
    orderedNodes.map((node) => [node.id, node.data.draft]),
  );

  const draft = {
    triggerEvent,
    nodes: orderedNodes.map((node) => ({ ...node.data.draft })),
    edges: edges.map((edge) => ({
      source: nodeDraftById.get(edge.source)?.id || '',
      target: nodeDraftById.get(edge.target)?.id || '',
      branch: edge.data?.branch || '',
    })),
  };

  draft.nodes.sort((left, right) => {
    if (left.type === 'trigger' && right.type !== 'trigger') {
      return -1;
    }
    if (left.type !== 'trigger' && right.type === 'trigger') {
      return 1;
    }
    return 0;
  });

  return draft;
};

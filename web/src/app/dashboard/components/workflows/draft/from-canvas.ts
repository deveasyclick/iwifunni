import type { WorkflowCanvasNode, WorkflowCanvasEdge } from '../types/canvas';
import type { WorkflowBuilderDraft } from './types';

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

import type {
  WorkflowDefinitionIssue,
  BuilderNodeDraft,
  WorkflowBuilderDraft,
} from '@/app/dashboard/components/workflows/types/draft';
import { buildDraftFromCanvas } from '@/app/dashboard/components/workflows/draft/from-canvas';
import { getNodeDisplayName } from '@/app/dashboard/components/workflows/utils/display';
import type {
  WorkflowBuilderStoreState,
  WorkflowCanvasNode,
  WorkflowCanvasEdge,
} from './types';

// ─── Draft derivation ───────────────────────────────────────────────────────

export const selectCurrentDraft = (
  state: Pick<WorkflowBuilderStoreState, 'triggerEvent' | 'nodes' | 'edges'>,
): WorkflowBuilderDraft =>
  buildDraftFromCanvas(state.triggerEvent, state.nodes, state.edges);

// ─── Node issues map ────────────────────────────────────────────────────────

export const buildNodeIssuesMap = (
  nodes: WorkflowBuilderDraft['nodes'],
  issues: WorkflowDefinitionIssue[],
): Map<string, WorkflowDefinitionIssue[]> => {
  const map = new Map<string, WorkflowDefinitionIssue[]>();

  nodes.forEach((draftNode, index) => {
    const nodeIssues = issues.filter((issue) =>
      issue.path.startsWith(`nodes.${index}`),
    );
    if (nodeIssues.length > 0) {
      map.set(draftNode.id, nodeIssues);
    }
  });

  return map;
};

// ─── Canvas enrichment ──────────────────────────────────────────────────────

export const enrichCanvasNodes = (
  nodes: WorkflowCanvasNode[],
  triggerEvent: string,
  removeNode: (nodeId: string) => void,
  duplicateNode: (nodeId: string) => void,
  setSelection: (selection: {
    nodeId?: string | null;
    edgeId?: string | null;
  }) => void,
  nodeIssuesMap: Map<string, WorkflowDefinitionIssue[]>,
  canvasHorizontalOffset: number,
  canvasVerticalOffset: number,
): WorkflowCanvasNode[] =>
  nodes.map((node) => ({
    ...node,
    position: {
      ...node.position,
      x: node.position.x + canvasHorizontalOffset,
      y: node.position.y + canvasVerticalOffset,
    },
    data: {
      ...node.data,
      triggerEvent,
      onEditNode: (nodeId: string) => setSelection({ nodeId, edgeId: null }),
      onRemoveNode: removeNode,
      onDuplicateNode: duplicateNode,
      canDelete: node.data.draft.type !== 'trigger',
      canDuplicate: node.data.draft.type !== 'trigger',
      nodeIssues: nodeIssuesMap.get(node.data.draft.id) || [],
    },
  }));

export const enrichCanvasEdges = (
  edges: WorkflowCanvasEdge[],
  nodes: WorkflowCanvasNode[],
  insertNodeOnEdge: (
    edgeId: string,
    type: BuilderNodeDraft['type'],
    options?: { channel?: string; branch?: string },
  ) => void,
): WorkflowCanvasEdge[] => {
  const mappedEdges = edges.map((edge) => ({
    ...edge,
    data: {
      branch: edge.data?.branch || '',
      onInsertNode: insertNodeOnEdge,
    },
  }));

  const lastNode = nodes.find(
    (node) => !edges.some((edge) => edge.source === node.id),
  );

  if (!lastNode) {
    return mappedEdges;
  }

  return [
    ...mappedEdges,
    {
      id: `terminal:${lastNode.id}`,
      source: lastNode.id,
      target: lastNode.id,
      sourceHandle: 'default',
      type: 'workflow-edge' as const,
      data: {
        branch: '',
        isTerminal: true,
        onInsertNode: insertNodeOnEdge,
      },
    } as WorkflowCanvasEdge,
  ];
};

// ─── Selection helpers ──────────────────────────────────────────────────────

export const findSelectedNode = (
  nodes: WorkflowCanvasNode[],
  selectedNodeId: string | null,
): WorkflowCanvasNode | null =>
  nodes.find((node) => node.id === selectedNodeId) || null;

export const findSelectedEdge = (
  edges: WorkflowCanvasEdge[],
  selectedEdgeId: string | null,
): WorkflowCanvasEdge | null =>
  edges.find((edge) => edge.id === selectedEdgeId) || null;

export const findSelectedNodeIndex = (
  draftNodes: WorkflowBuilderDraft['nodes'],
  selectedNode: WorkflowCanvasNode | null,
): number => {
  if (!selectedNode) return -1;
  return draftNodes.findIndex((node) => node.id === selectedNode.data.draft.id);
};

export const getNodeIssueCount = (
  issues: WorkflowDefinitionIssue[],
  selectedNodeIndex: number,
): WorkflowDefinitionIssue[] => {
  if (selectedNodeIndex < 0) return [];
  return issues.filter((issue) =>
    issue.path.startsWith(`nodes.${selectedNodeIndex}`),
  );
};

export const getConnectedEdgeCounts = (
  edges: WorkflowCanvasEdge[],
  selectedNode: WorkflowCanvasNode | null,
): { incoming: number; outgoing: number } => {
  if (!selectedNode) return { incoming: 0, outgoing: 0 };
  return {
    incoming: edges.filter((edge) => edge.target === selectedNode.id).length,
    outgoing: edges.filter((edge) => edge.source === selectedNode.id).length,
  };
};

export const getEdgeNodeLabels = (
  edge: WorkflowCanvasEdge | null,
  nodes: WorkflowCanvasNode[],
): { source: string; target: string } => {
  if (!edge) return { source: '', target: '' };

  const fallbackDraft: BuilderNodeDraft = {
    id: '',
    name: '',
    type: 'delay',
    duration: '',
    templateId: '',
    channel: '',
    field: '',
    operator: '',
    value: '',
  };

  return {
    source: getNodeDisplayName(
      nodes.find((node) => node.id === edge.source)?.data.draft ??
        fallbackDraft,
    ),
    target: getNodeDisplayName(
      nodes.find((node) => node.id === edge.target)?.data.draft ??
        fallbackDraft,
    ),
  };
};

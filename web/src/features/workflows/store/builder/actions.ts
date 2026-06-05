import type { WorkflowNodeType } from '@/features/workflows/types/draft';
import { createNodeDraft } from '@/features/workflows/draft/create-node';
import { normalizeNodeDraftForType } from '@/features/workflows/draft/normalize';
import {
  buildCanvasNode,
  buildCanvasEdge,
  layoutCanvasGraph,
} from '@/features/workflows/utils/canvas';
import type { WorkflowBuilderStoreState } from '../../types/store';
import type { AddConnectedNodeOptions } from '../../types/actions';

const createCanvasNodeId = () =>
  `canvas_${Math.random().toString(36).slice(2, 10)}`;

// ─── Action factories (pure functions returning partial state) ──────────────

export function addConnectedNodeAction(
  state: Pick<WorkflowBuilderStoreState, 'nodes' | 'edges'>,
  sourceNodeId: string,
  type: WorkflowNodeType,
  options?: AddConnectedNodeOptions,
): Partial<WorkflowBuilderStoreState> {
  const nextNode = buildCanvasNode(createNodeDraft(type, options?.channel));
  const nextEdge = buildCanvasEdge(sourceNodeId, nextNode.id);
  const nextGraph = layoutCanvasGraph(
    [...state.nodes, nextNode],
    [...state.edges, nextEdge],
  );

  return {
    nodes: nextGraph.nodes,
    edges: nextGraph.edges,
    selectedNodeId: nextNode.id,
    selectedEdgeId: null,
  };
}

export function insertNodeOnEdgeAction(
  state: Pick<WorkflowBuilderStoreState, 'nodes' | 'edges'>,
  edgeId: string,
  type: WorkflowNodeType,
  options?: AddConnectedNodeOptions,
): Partial<WorkflowBuilderStoreState> {
  const currentEdge = state.edges.find((edge) => edge.id === edgeId);
  if (!currentEdge) {
    if (edgeId.startsWith('terminal:')) {
      const sourceNodeId = edgeId.slice('terminal:'.length);
      const sourceNode = state.nodes.find((node) => node.id === sourceNodeId);
      if (!sourceNode) {
        return {};
      }

      const nextNode = buildCanvasNode(createNodeDraft(type, options?.channel));
      const nextGraph = layoutCanvasGraph(
        [...state.nodes, nextNode],
        [...state.edges, buildCanvasEdge(sourceNodeId, nextNode.id)],
      );

      return {
        nodes: nextGraph.nodes,
        edges: nextGraph.edges,
        selectedNodeId: nextNode.id,
        selectedEdgeId: null,
      };
    }
    return {};
  }

  const nextNode = buildCanvasNode(createNodeDraft(type, options?.channel));
  const remainingEdges = state.edges.filter((edge) => edge.id !== edgeId);
  const nextGraph = layoutCanvasGraph(
    [...state.nodes, nextNode],
    [
      ...remainingEdges,
      buildCanvasEdge(currentEdge.source, nextNode.id),
      buildCanvasEdge(nextNode.id, currentEdge.target),
    ],
  );

  return {
    nodes: nextGraph.nodes,
    edges: nextGraph.edges,
    selectedNodeId: nextNode.id,
    selectedEdgeId: null,
  };
}

export function duplicateNodeAction(
  state: Pick<WorkflowBuilderStoreState, 'nodes' | 'edges'>,
  nodeId: string,
): Partial<WorkflowBuilderStoreState> {
  const currentNode = state.nodes.find((node) => node.id === nodeId);
  if (!currentNode || currentNode.data.draft.type === 'trigger') {
    return {};
  }

  const duplicatedDraft = normalizeNodeDraftForType({
    ...currentNode.data.draft,
    id: createNodeDraft(
      currentNode.data.draft.type,
      currentNode.data.draft.channel || undefined,
    ).id,
  });
  const duplicatedNode = buildCanvasNode(duplicatedDraft);
  const currentEdges = state.edges;
  const outgoingEdges = currentEdges.filter((edge) => edge.source === nodeId);
  const nextEdges = currentEdges.filter((edge) => edge.source !== nodeId);

  nextEdges.push(buildCanvasEdge(nodeId, duplicatedNode.id));
  if (outgoingEdges.length > 0) {
    nextEdges.push(buildCanvasEdge(duplicatedNode.id, outgoingEdges[0].target));
  }

  const nextGraph = layoutCanvasGraph(
    [...state.nodes, duplicatedNode],
    nextEdges,
  );

  return {
    nodes: nextGraph.nodes,
    edges: nextGraph.edges,
    selectedNodeId: duplicatedNode.id,
    selectedEdgeId: null,
  };
}

export function removeNodeAction(
  state: Pick<WorkflowBuilderStoreState, 'nodes' | 'edges'>,
  nodeId: string,
): Partial<WorkflowBuilderStoreState> {
  const currentNodes = state.nodes;
  const currentEdges = state.edges;
  const remainingNodes = currentNodes.filter((node) => node.id !== nodeId);
  const nextNodes =
    remainingNodes.length === 0
      ? [buildCanvasNode(createNodeDraft('trigger'), createCanvasNodeId())]
      : remainingNodes;
  const incomingEdges = currentEdges.filter((edge) => edge.target === nodeId);
  const outgoingEdges = currentEdges.filter((edge) => edge.source === nodeId);
  const nextEdges = currentEdges.filter(
    (edge) => edge.source !== nodeId && edge.target !== nodeId,
  );
  if (
    incomingEdges.length === 1 &&
    outgoingEdges.length === 1 &&
    incomingEdges[0].source !== outgoingEdges[0].target
  ) {
    nextEdges.push(
      buildCanvasEdge(incomingEdges[0].source, outgoingEdges[0].target),
    );
  }
  const nextGraph = layoutCanvasGraph(nextNodes, nextEdges);

  return {
    nodes: nextGraph.nodes,
    edges: nextGraph.edges,
    selectedNodeId: null,
    selectedEdgeId: null,
  };
}

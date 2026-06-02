import { addEdge, applyEdgeChanges, applyNodeChanges } from '@xyflow/react';
import { createStore } from 'zustand/vanilla';
import type { WorkflowBuilderDraft, WorkflowBuilderStoreState } from './types';
import {
  buildCanvasEdge,
  buildCanvasNode,
  createNodeDraft,
  layoutCanvasGraph,
  normalizeNodeDraftForType,
} from './utils';
import { buildCanvasGraphFromDraft } from '../utils';

export const createWorkflowBuilderStore = (draft: WorkflowBuilderDraft) => {
  const graph = buildCanvasGraphFromDraft(draft);

  return createStore<WorkflowBuilderStoreState>((set, get) => ({
    triggerEvent: draft.triggerEvent,
    nodes: graph.nodes,
    edges: graph.edges,
    selectedNodeId: null,
    selectedEdgeId: null,
    setCanvasFromDraft: (nextDraft) => {
      const nextGraph = buildCanvasGraphFromDraft(nextDraft);
      set({
        triggerEvent: nextDraft.triggerEvent,
        nodes: nextGraph.nodes,
        edges: nextGraph.edges,
        selectedNodeId: null,
        selectedEdgeId: null,
      });
    },
    setTriggerEvent: (value) => set({ triggerEvent: value }),
    addConnectedNode: (sourceNodeId, type, options) => {
      const nextNode = buildCanvasNode(createNodeDraft(type, options?.channel));
      const nextEdge = buildCanvasEdge(sourceNodeId, nextNode.id);
      const nextGraph = layoutCanvasGraph(
        [...get().nodes, nextNode],
        [...get().edges, nextEdge],
      );
      set({
        nodes: nextGraph.nodes,
        edges: nextGraph.edges,
        selectedNodeId: nextNode.id,
        selectedEdgeId: null,
      });
    },
    insertNodeOnEdge: (edgeId, type, options) => {
      const currentEdge = get().edges.find((edge) => edge.id === edgeId);
      if (!currentEdge) {
        if (edgeId.startsWith('terminal:')) {
          const sourceNodeId = edgeId.slice('terminal:'.length);
          const sourceNode = get().nodes.find(
            (node) => node.id === sourceNodeId,
          );
          if (!sourceNode) {
            return;
          }

          const nextNode = buildCanvasNode(
            createNodeDraft(type, options?.channel),
          );
          const nextGraph = layoutCanvasGraph(
            [...get().nodes, nextNode],
            [...get().edges, buildCanvasEdge(sourceNodeId, nextNode.id)],
          );

          set({
            nodes: nextGraph.nodes,
            edges: nextGraph.edges,
            selectedNodeId: nextNode.id,
            selectedEdgeId: null,
          });
        }
        return;
      }

      const nextNode = buildCanvasNode(createNodeDraft(type, options?.channel));
      const remainingEdges = get().edges.filter((edge) => edge.id !== edgeId);
      const nextGraph = layoutCanvasGraph(
        [...get().nodes, nextNode],
        [
          ...remainingEdges,
          buildCanvasEdge(currentEdge.source, nextNode.id),
          buildCanvasEdge(nextNode.id, currentEdge.target),
        ],
      );

      set({
        nodes: nextGraph.nodes,
        edges: nextGraph.edges,
        selectedNodeId: nextNode.id,
        selectedEdgeId: null,
      });
    },
    updateNodeDraft: (nodeId, updater) => {
      set((state) => ({
        nodes: state.nodes.map((node) => {
          if (node.id !== nodeId) {
            return node;
          }
          const nextDraft = normalizeNodeDraftForType(updater(node.data.draft));
          return { ...node, data: { draft: nextDraft } };
        }),
      }));
    },
    duplicateNode: (nodeId) => {
      const currentNode = get().nodes.find((node) => node.id === nodeId);
      if (!currentNode || currentNode.data.draft.type === 'trigger') {
        return;
      }

      const duplicatedDraft = normalizeNodeDraftForType({
        ...currentNode.data.draft,
        id: createNodeDraft(
          currentNode.data.draft.type,
          currentNode.data.draft.channel || undefined,
        ).id,
      });
      const duplicatedNode = buildCanvasNode(duplicatedDraft);
      const currentEdges = get().edges;
      const outgoingEdges = currentEdges.filter(
        (edge) => edge.source === nodeId,
      );
      const nextEdges = currentEdges.filter((edge) => edge.source !== nodeId);

      nextEdges.push(buildCanvasEdge(nodeId, duplicatedNode.id));
      if (outgoingEdges.length > 0) {
        nextEdges.push(
          buildCanvasEdge(duplicatedNode.id, outgoingEdges[0].target),
        );
      }

      const nextGraph = layoutCanvasGraph(
        [...get().nodes, duplicatedNode],
        nextEdges,
      );
      set({
        nodes: nextGraph.nodes,
        edges: nextGraph.edges,
        selectedNodeId: duplicatedNode.id,
        selectedEdgeId: null,
      });
    },
    removeNode: (nodeId) => {
      const currentNodes = get().nodes;
      const currentEdges = get().edges;
      const remainingNodes = currentNodes.filter((node) => node.id !== nodeId);
      const nextNodes =
        remainingNodes.length === 0
          ? [buildCanvasNode(createNodeDraft('trigger'))]
          : remainingNodes;
      const incomingEdges = currentEdges.filter(
        (edge) => edge.target === nodeId,
      );
      const outgoingEdges = currentEdges.filter(
        (edge) => edge.source === nodeId,
      );
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
      set({
        nodes: nextGraph.nodes,
        edges: nextGraph.edges,
        selectedNodeId: null,
        selectedEdgeId: null,
      });
    },
    onNodesChange: (changes) =>
      set((state) => ({ nodes: applyNodeChanges(changes, state.nodes) })),
    onEdgesChange: (changes) =>
      set((state) => ({ edges: applyEdgeChanges(changes, state.edges) })),
    connectNodes: (connection) => {
      if (!connection.source || !connection.target) {
        return;
      }
      const nextEdge = buildCanvasEdge(connection.source, connection.target);
      set((state) => ({
        edges: addEdge(nextEdge, state.edges),
        selectedEdgeId: nextEdge.id,
        selectedNodeId: null,
      }));
    },
    updateEdgeBranch: (edgeId, _branch) =>
      set((state) => ({
        edges: state.edges.map((edge) =>
          edge.id === edgeId
            ? {
                ...edge,
                sourceHandle: 'default',
                label: undefined,
                data: { branch: '' },
              }
            : edge,
        ),
      })),
    removeEdge: (edgeId) =>
      set((state) => {
        // Terminal edges (the "+" button) cannot be removed
        if (edgeId.startsWith('terminal:')) {
          return state;
        }
        return {
          edges: state.edges.filter((edge) => edge.id !== edgeId),
          selectedEdgeId:
            state.selectedEdgeId === edgeId ? null : state.selectedEdgeId,
        };
      }),
    setSelection: ({ nodeId, edgeId }) =>
      set({ selectedNodeId: nodeId ?? null, selectedEdgeId: edgeId ?? null }),
    autoLayout: () => {
      const nextGraph = layoutCanvasGraph(get().nodes, get().edges);
      set({ nodes: nextGraph.nodes, edges: nextGraph.edges });
    },
  }));
};

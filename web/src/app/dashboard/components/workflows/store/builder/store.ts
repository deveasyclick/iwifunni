import { addEdge, applyEdgeChanges, applyNodeChanges } from '@xyflow/react';
import { createStore } from 'zustand/vanilla';
import type { WorkflowBuilderDraft } from '@/app/dashboard/components/workflows/types/draft';
import { buildCanvasGraphFromDraft } from '@/app/dashboard/components/workflows/utils/canvas';
import { buildCanvasEdge } from '@/app/dashboard/components/workflows/utils/canvas';
import { layoutCanvasGraph } from '@/app/dashboard/components/workflows/utils/canvas';
import { normalizeNodeDraftForType } from '@/app/dashboard/components/workflows/draft/normalize';
import {
  addConnectedNodeAction,
  insertNodeOnEdgeAction,
  duplicateNodeAction,
  removeNodeAction,
} from './actions';
import type { WorkflowBuilderStoreState } from './types';

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
      set(addConnectedNodeAction(get(), sourceNodeId, type, options));
    },
    insertNodeOnEdge: (edgeId, type, options) => {
      set(insertNodeOnEdgeAction(get(), edgeId, type, options));
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
      set(duplicateNodeAction(get(), nodeId));
    },
    removeNode: (nodeId) => {
      set(removeNodeAction(get(), nodeId));
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

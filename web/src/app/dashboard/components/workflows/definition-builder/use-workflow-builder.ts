'use client';

import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { createWorkflowBuilderStore } from '../store/builder';
import type { WorkflowDefinitionIssue } from '../types/draft';
import type { WorkflowDefinitionBuilderProps } from './types';
import { buildDraftFromCanvas } from '../draft';
import { getNodeDisplayName } from '../utils/display';

export const useWorkflowBuilder = ({
  value,
  onChange,
  issues,
}: WorkflowDefinitionBuilderProps) => {
  const [store] = useState(() => createWorkflowBuilderStore(value));
  const lastDraftSignatureRef = useRef(JSON.stringify(value));

  const triggerEvent = useStore(store, (state) => state.triggerEvent);
  const nodes = useStore(store, (state) => state.nodes);
  const edges = useStore(store, (state) => state.edges);
  const selectedNodeId = useStore(store, (state) => state.selectedNodeId);
  const selectedEdgeId = useStore(store, (state) => state.selectedEdgeId);
  const setTriggerEvent = useStore(store, (state) => state.setTriggerEvent);
  const insertNodeOnEdge = useStore(store, (state) => state.insertNodeOnEdge);
  const updateNodeDraft = useStore(store, (state) => state.updateNodeDraft);
  const duplicateNode = useStore(store, (state) => state.duplicateNode);
  const removeNode = useStore(store, (state) => state.removeNode);
  const onNodesChange = useStore(store, (state) => state.onNodesChange);
  const onEdgesChange = useStore(store, (state) => state.onEdgesChange);
  const connectNodes = useStore(store, (state) => state.connectNodes);
  const removeEdge = useStore(store, (state) => state.removeEdge);
  const setSelection = useStore(store, (state) => state.setSelection);

  const currentDraft = useMemo(
    () => buildDraftFromCanvas(triggerEvent, nodes, edges),
    [edges, nodes, triggerEvent],
  );

  const canvasHorizontalOffset = 220;
  const canvasVerticalOffset = 120;

  // Derive a map of node ID to its issues
  const nodeIssuesMap = useMemo(() => {
    const map = new Map<string, WorkflowDefinitionIssue[]>();

    currentDraft.nodes.forEach((draftNode, index) => {
      const nodeIssues = issues.filter((issue) =>
        issue.path.startsWith(`nodes.${index}`),
      );
      if (nodeIssues.length > 0) {
        map.set(draftNode.id, nodeIssues);
      }
    });

    return map;
  }, [currentDraft.nodes, issues]);

  const canvasNodes = useMemo(
    () =>
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
          onEditNode: (nodeId: string) =>
            setSelection({ nodeId, edgeId: null }),
          onRemoveNode: removeNode,
          onDuplicateNode: duplicateNode,
          canDelete: node.data.draft.type !== 'trigger',
          canDuplicate: node.data.draft.type !== 'trigger',
          nodeIssues: nodeIssuesMap.get(node.data.draft.id) || [],
        },
      })),
    [
      canvasHorizontalOffset,
      canvasVerticalOffset,
      duplicateNode,
      nodeIssuesMap,
      nodes,
      removeNode,
      setSelection,
      triggerEvent,
    ],
  );

  const canvasEdges = useMemo(() => {
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
      },
    ];
  }, [edges, insertNodeOnEdge, nodes]);

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) || null,
    [nodes, selectedNodeId],
  );
  const selectedEdge = useMemo(
    () => edges.find((edge) => edge.id === selectedEdgeId) || null,
    [edges, selectedEdgeId],
  );
  const selectedNodeIndex = useMemo(() => {
    if (!selectedNode) {
      return -1;
    }

    return currentDraft.nodes.findIndex(
      (node) => node.id === selectedNode.data.draft.id,
    );
  }, [currentDraft.nodes, selectedNode]);
  const selectedNodeIssues = useMemo(() => {
    if (selectedNodeIndex < 0) {
      return [];
    }

    return issues.filter((issue) =>
      issue.path.startsWith(`nodes.${selectedNodeIndex}`),
    );
  }, [issues, selectedNodeIndex]);
  const selectedNodeIncoming = selectedNode
    ? edges.filter((edge) => edge.target === selectedNode.id).length
    : 0;
  const selectedNodeOutgoing = selectedNode
    ? edges.filter((edge) => edge.source === selectedNode.id).length
    : 0;
  const selectedEdgeSourceLabel = selectedEdge
    ? getNodeDisplayName(
        nodes.find((node) => node.id === selectedEdge.source)?.data.draft ?? {
          id: '',
          name: '',
          type: 'delay',
          duration: '',
          templateId: '',
          channel: '',
          field: '',
          operator: '',
          value: '',
        },
      )
    : '';
  const selectedEdgeTargetLabel = selectedEdge
    ? getNodeDisplayName(
        nodes.find((node) => node.id === selectedEdge.target)?.data.draft ?? {
          id: '',
          name: '',
          type: 'delay',
          duration: '',
          templateId: '',
          channel: '',
          field: '',
          operator: '',
          value: '',
        },
      )
    : '';

  useEffect(() => {
    const externalSignature = JSON.stringify(value);
    if (externalSignature === lastDraftSignatureRef.current) {
      return;
    }

    store.getState().setCanvasFromDraft(value);
    lastDraftSignatureRef.current = externalSignature;
  }, [store, value]);

  useEffect(() => {
    const nextSignature = JSON.stringify(currentDraft);
    if (nextSignature === lastDraftSignatureRef.current) {
      return;
    }

    lastDraftSignatureRef.current = nextSignature;
    startTransition(() => onChange(currentDraft));
  }, [currentDraft, onChange]);

  return {
    canvasEdges,
    canvasNodes,
    connectNodes,
    edges,
    issues,
    nodes,
    onEdgesChange,
    onNodesChange,
    removeEdge,
    removeNode,
    duplicateNode,
    selectedEdge,
    selectedEdgeSourceLabel,
    selectedEdgeTargetLabel,
    selectedNode,
    selectedNodeIncoming,
    selectedNodeIssues,
    selectedNodeOutgoing,
    setSelection,
    setTriggerEvent,
    triggerEvent,
    updateNodeDraft,
  };
};

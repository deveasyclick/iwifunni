import type { WorkflowDefinitionIssue } from '@/features/workflows/types/draft';
import type { WorkflowDefinition } from '@/app/types/workflow';

export const validateEdges = (
  definition: WorkflowDefinition,
): WorkflowDefinitionIssue[] => {
  const issues: WorkflowDefinitionIssue[] = [];
  const seenNodeIDs = new Set<string>();
  const nodePathByID = new Map<string, string>();
  const adjacency = new Map<string, string[]>();
  const incomingEdges = new Map<string, number>();
  const outgoingEdges = new Map<string, number>();

  definition.nodes.forEach((node, index) => {
    seenNodeIDs.add(node.id.trim());
    nodePathByID.set(node.id.trim(), `nodes.${index}`);
    adjacency.set(node.id.trim(), []);
    incomingEdges.set(node.id.trim(), 0);
    outgoingEdges.set(node.id.trim(), 0);
  });

  definition.edges.forEach((edge, index) => {
    const edgePath = `edges.${index}`;
    const source = edge.source.trim();
    const target = edge.target.trim();
    const branch = edge.branch?.trim() || '';

    if (!source || !target) {
      issues.push({
        path: edgePath,
        message: 'Each edge must include both a source and target node.',
      });
      return;
    }

    if (!seenNodeIDs.has(source) || !seenNodeIDs.has(target)) {
      issues.push({
        path: edgePath,
        message: 'Edges must point to nodes that exist in the builder.',
      });
      return;
    }

    if (branch) {
      issues.push({
        path: `${edgePath}.branch`,
        message: 'Branching is not supported in the linear workflow builder.',
      });
    }

    adjacency.set(source, [...(adjacency.get(source) || []), target]);
    incomingEdges.set(target, (incomingEdges.get(target) || 0) + 1);
    outgoingEdges.set(source, (outgoingEdges.get(source) || 0) + 1);
  });

  const startNodes = Array.from(seenNodeIDs).filter(
    (nodeID) => (incomingEdges.get(nodeID) || 0) === 0,
  );

  if (seenNodeIDs.size > 0 && startNodes.length === 0) {
    issues.push({
      path: 'edges',
      message:
        'Workflow graph must have one start node with no incoming edges.',
    });
  }

  if (startNodes.length > 1) {
    issues.push({
      path: 'edges',
      message:
        'Linear workflows must form a single path with exactly one start node.',
    });
  }

  const triggerNodeIDs = new Set<string>();
  definition.nodes.forEach((node) => {
    if (node.type === 'trigger') {
      triggerNodeIDs.add(node.id.trim());
    }
  });

  if (triggerNodeIDs.size === 1) {
    const triggerNodeID = Array.from(triggerNodeIDs)[0];
    if ((incomingEdges.get(triggerNodeID) || 0) > 0) {
      issues.push({
        path: `${nodePathByID.get(triggerNodeID) || 'nodes'}.edges`,
        message: 'The trigger node must be the first step in the workflow.',
      });
    }
  }

  for (const nodeID of seenNodeIDs) {
    const nodePath = nodePathByID.get(nodeID) || 'nodes';
    const incomingCount = incomingEdges.get(nodeID) || 0;
    const outgoingCount = outgoingEdges.get(nodeID) || 0;

    if (incomingCount > 1) {
      issues.push({
        path: `${nodePath}.edges`,
        message:
          'Linear workflows allow only one incoming connection per node.',
      });
    }

    if (outgoingCount > 1) {
      issues.push({
        path: `${nodePath}.edges`,
        message:
          'Linear workflows allow only one outgoing connection per node.',
      });
    }
  }

  // Cycle detection
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const hasCycle = (nodeID: string): boolean => {
    if (visited.has(nodeID)) return false;
    if (visiting.has(nodeID)) return true;
    visiting.add(nodeID);
    for (const next of adjacency.get(nodeID) || []) {
      if (hasCycle(next)) return true;
    }
    visiting.delete(nodeID);
    visited.add(nodeID);
    return false;
  };

  for (const nodeID of adjacency.keys()) {
    if (hasCycle(nodeID)) {
      issues.push({
        path: 'edges',
        message: 'Workflow graph cannot contain cycles.',
      });
      break;
    }
  }

  // Connectivity check
  if (startNodes.length === 1) {
    const reachable = new Set<string>();
    const visit = (nodeID: string) => {
      if (reachable.has(nodeID)) return;
      reachable.add(nodeID);
      for (const next of adjacency.get(nodeID) || []) {
        visit(next);
      }
    };

    visit(startNodes[0]);

    if (reachable.size !== seenNodeIDs.size) {
      issues.push({
        path: 'edges',
        message: 'All workflow nodes must belong to one connected linear path.',
      });
    }
  }

  return issues;
};

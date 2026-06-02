import type { WorkflowChannel, WorkflowDefinition } from '@/app/types/workflow';
import type { WorkflowDefinitionIssue } from '../definition-builder';
import {
  durationPattern,
  notificationChannels,
  uuidPattern,
  zeroUUID,
} from '../definition-builder/constants';

const validateWorkflowDefinitionDraft = (
  definition?: WorkflowDefinition,
): WorkflowDefinitionIssue[] => {
  if (!definition) {
    return [
      { path: 'definition', message: 'Workflow definition is required.' },
    ];
  }

  const issues: WorkflowDefinitionIssue[] = [];
  const seenNodeIDs = new Set<string>();
  const nodePathByID = new Map<string, string>();
  const adjacency = new Map<string, string[]>();
  const incomingEdges = new Map<string, number>();
  const outgoingEdges = new Map<string, number>();
  const triggerNodeIDs = new Set<string>();

  if (!definition.trigger?.event?.trim()) {
    issues.push({
      path: 'trigger.event',
      message:
        'A trigger event is still required by the current backend event API.',
    });
  }

  if (definition.nodes.length === 0) {
    issues.push({
      path: 'nodes',
      message: 'At least one workflow node is required.',
    });
  }

  definition.nodes.forEach((node, index) => {
    const nodePath = `nodes.${index}`;
    const nodeID = node.id.trim();
    if (!nodeID) {
      issues.push({ path: `${nodePath}.id`, message: 'Node ID is required.' });
      return;
    }
    if (seenNodeIDs.has(nodeID)) {
      issues.push({
        path: `${nodePath}.id`,
        message: `Duplicate node ID '${nodeID}'.`,
      });
    }
    seenNodeIDs.add(nodeID);
    nodePathByID.set(nodeID, nodePath);
    adjacency.set(nodeID, []);
    incomingEdges.set(nodeID, 0);
    outgoingEdges.set(nodeID, 0);

    if (node.type === 'trigger') {
      triggerNodeIDs.add(nodeID);
    }

    const config = node.config || {};
    if (node.type === 'delay') {
      const duration =
        typeof config.duration === 'string' ? config.duration.trim() : '';
      if (!durationPattern.test(duration)) {
        issues.push({
          path: `${nodePath}.duration`,
          message:
            'Delay duration must use Go duration syntax like 5m or 1h30m.',
        });
      }
    }
    if (node.type === 'notification') {
      const templateID =
        typeof config.template_id === 'string' ? config.template_id.trim() : '';
      const channels = Array.isArray(config.channels)
        ? config.channels.filter(
            (channel): channel is string => typeof channel === 'string',
          )
        : [];
      if (
        templateID &&
        templateID !== zeroUUID &&
        !uuidPattern.test(templateID)
      ) {
        issues.push({
          path: `${nodePath}.template_id`,
          message: 'Notification template ID must be a valid UUID.',
        });
      }
      if (!templateID || templateID === zeroUUID) {
        issues.push({
          path: `${nodePath}.template_id`,
          message:
            'This notification step has no configured template. Open the channel editor to set it up.',
        });
      }
      if (
        channels.length !== 1 ||
        !notificationChannels.includes(channels[0] as WorkflowChannel)
      ) {
        issues.push({
          path: `${nodePath}.channels`,
          message:
            'Notification steps currently require exactly one supported channel.',
        });
      }
    }
    if (node.type === 'condition') {
      issues.push({
        path: `${nodePath}.type`,
        message:
          'Condition steps are not supported in the linear workflow builder.',
      });
    }
  });

  if (triggerNodeIDs.size === 0) {
    issues.push({
      path: 'nodes',
      message:
        'A workflow should start with a trigger node for testing and flow entry.',
    });
  }
  if (triggerNodeIDs.size > 1) {
    issues.push({
      path: 'nodes',
      message: 'Linear workflows support exactly one trigger node.',
    });
  }

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

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const hasCycle = (nodeID: string): boolean => {
    if (visited.has(nodeID)) {
      return false;
    }
    if (visiting.has(nodeID)) {
      return true;
    }
    visiting.add(nodeID);
    for (const next of adjacency.get(nodeID) || []) {
      if (hasCycle(next)) {
        return true;
      }
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

  if (startNodes.length === 1) {
    const reachable = new Set<string>();
    const visit = (nodeID: string) => {
      if (reachable.has(nodeID)) {
        return;
      }

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

export default validateWorkflowDefinitionDraft;

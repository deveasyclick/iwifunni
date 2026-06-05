import type { WorkflowDefinitionIssue } from '@/features/workflows/types/draft';
import type { WorkflowChannel, WorkflowDefinition } from '@/app/types/workflow';
import {
  durationPattern,
  notificationChannels,
  uuidPattern,
  zeroUUID,
} from '../../constants';

export const validateNodes = (
  definition: WorkflowDefinition,
): WorkflowDefinitionIssue[] => {
  const issues: WorkflowDefinitionIssue[] = [];
  const seenNodeIDs = new Set<string>();
  const triggerNodeIDs = new Set<string>();

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

  return issues;
};

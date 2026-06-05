import type { WorkflowDefinitionIssue } from '@/features/workflows/types/draft';
import type { WorkflowDefinition } from '@/app/types/workflow';

export const validateTrigger = (
  definition: WorkflowDefinition,
): WorkflowDefinitionIssue[] => {
  const issues: WorkflowDefinitionIssue[] = [];

  if (!definition.trigger?.event?.trim()) {
    issues.push({
      path: 'trigger.event',
      message:
        'A trigger event is still required by the current backend event API.',
    });
  }

  return issues;
};

import type { WorkflowDefinition } from '@/app/types/workflow';
import type { WorkflowDefinitionIssue } from '@/app/dashboard/components/workflows/types/draft';
import { validateTrigger } from './trigger';
import { validateNodes } from './nodes';
import { validateEdges } from './edges';

const validateWorkflowDefinitionDraft = (
  definition?: WorkflowDefinition,
): WorkflowDefinitionIssue[] => {
  if (!definition) {
    return [
      { path: 'definition', message: 'Workflow definition is required.' },
    ];
  }

  return [
    ...validateTrigger(definition),
    ...validateNodes(definition),
    ...validateEdges(definition),
  ];
};

export default validateWorkflowDefinitionDraft;

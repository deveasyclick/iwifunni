import type { WorkflowBuilderDraft } from '../types/draft';
import { createNodeDraft } from './create-node';

export const createDefaultWorkflowBuilderDraft = (): WorkflowBuilderDraft => ({
  triggerEvent: 'user.signup',
  nodes: [
    {
      ...createNodeDraft('trigger'),
      id: 'trigger_1',
      name: 'Test trigger',
    },
  ],
  edges: [],
});

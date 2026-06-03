import type { BuilderNodeDraft } from '@/app/dashboard/components/workflows/types/draft';

export const buildNodeDescription = (draft: BuilderNodeDraft) => {
  switch (draft.type) {
    case 'trigger':
      return 'Starts the workflow when you test or receive the trigger event.';
    case 'delay':
      return 'Waits for a fixed amount of time before the next step runs.';
    case 'notification':
      return 'Sends a channel message using the content configured for this step.';
    case 'condition':
      return 'Legacy branching step retained for compatibility.';
    default:
      return 'Configure the behavior for this workflow step.';
  }
};

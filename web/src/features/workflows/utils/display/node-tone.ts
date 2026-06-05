import type { WorkflowNodeType } from '@/features/workflows/types/draft';

export const getNodeTone = (type: WorkflowNodeType) => {
  switch (type) {
    case 'notification':
      return 'border-primary/40 bg-primary/8 text-primary';
    case 'delay':
      return 'border-warning/35 bg-warning/10 text-warningemphasis';
    case 'condition':
      return 'border-info/35 bg-info/10 text-infoemphasis';
    case 'trigger':
      return 'border-success/35 bg-success/10 text-successemphasis';
    default:
      return 'border-border bg-muted/40 text-foreground';
  }
};

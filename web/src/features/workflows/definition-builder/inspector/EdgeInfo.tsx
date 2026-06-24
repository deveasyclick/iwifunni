'use client';

import type { EdgeInfoProps } from '@/features/workflows/types/ui';

export const EdgeInfo = ({ sourceLabel, targetLabel }: EdgeInfoProps) => (
  <div className="space-y-4">
    <div>
      <p className="text-sm font-medium">
        {sourceLabel || 'Source'} → {targetLabel || 'Target'}
      </p>
      <p className="text-xs text-muted-foreground">Linear transition</p>
    </div>
    <div className="rounded-xl border border-border p-3 text-sm text-muted-foreground">
      This transition is fixed to a single next step. Branch rules are not
      supported in the linear builder.
    </div>
  </div>
);

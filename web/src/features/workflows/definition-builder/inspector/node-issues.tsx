'use client';

import type { NodeIssuesProps } from '@/features/workflows/types/ui';

export const NodeIssues = ({ issues }: NodeIssuesProps) => {
  if (issues.length === 0) return null;

  return (
    <div className="space-y-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-destructive">
        Node issues
      </p>
      {issues.map((issue) => (
        <p
          key={`${issue.path}-${issue.message}`}
          className="text-sm text-destructive"
        >
          {issue.message}
        </p>
      ))}
    </div>
  );
};

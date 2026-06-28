'use client';

import Link from 'next/link';
import CardBox from '@/components/card/CardBox';
import { useWorkflowListQuery } from '@/features/workflows/queries';

export const TopWorkflows = () => {
  const { data: workflows = [] } = useWorkflowListQuery();
  const topWorkflows = workflows.slice(0, 5);

  return (
    <CardBox>
      <div className="flex items-center justify-between mb-3">
        <h5 className="card-title">Top workflows</h5>
        <Link
          href="/dashboard/apps/workflows"
          className="text-sm text-primary hover:underline"
        >
          View all workflows →
        </Link>
      </div>

      <div className="space-y-4">
        {topWorkflows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No workflows configured yet.
          </p>
        ) : (
          topWorkflows.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between py-2 border-b border-border last:border-none gap-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground font-mono truncate">
                  {item.key}
                </p>
              </div>

              <div className="text-sm text-muted-foreground w-20 text-right capitalize">
                {item.triggerEvent ||
                  item.definition?.trigger?.event ||
                  `${item.channels?.length ?? 0} channels`}
              </div>

              <div
                className={`text-sm font-medium w-20 text-right ${
                  item.status === 'active' || item.isActive
                    ? 'text-success'
                    : 'text-muted-foreground'
                }`}
              >
                {item.status || (item.isActive ? 'Active' : 'Archived')}
              </div>
            </div>
          ))
        )}
      </div>
    </CardBox>
  );
};

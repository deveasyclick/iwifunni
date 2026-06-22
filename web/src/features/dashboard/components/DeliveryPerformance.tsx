'use client';

import CardBox from '@/components/card/CardBox';
import { Icon } from '@iconify/react';
import { computeMetrics } from '../utils';

interface DeliveryPerformanceProps {
  readonly stats?: Array<{
    status: string;
    count: number;
  }>;
  readonly totalNotifications?: number;
  readonly isLoading?: boolean;
}

function trendClass(trend: 'up' | 'down'): string {
  return trend === 'up' ? 'text-success' : 'text-error';
}

function trendIcon(trend: 'up' | 'down'): string {
  return trend === 'up' ? 'mdi:arrow-up-thin' : 'mdi:arrow-down-thin';
}

function renderMetrics(metrics: ReturnType<typeof computeMetrics>) {
  return (
    <div className="grid grid-cols-4 gap-4 mt-4">
      {metrics.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-border p-4 bg-muted/30 hover:scale-105 transition-all ease-in-out"
        >
          <p className="text-xs text-muted-foreground mb-2">{item.label}</p>
          <div className="flex items-center gap-2">
            <p className="text-lg font-semibold">{item.value}</p>
            {item.change && (
              <span
                className={`flex items-center text-xs font-medium ${trendClass(item.trend)}`}
              >
                <Icon icon={trendIcon(item.trend)} className="w-4 h-4" />
                {item.change}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

const DeliveryPerformance = ({
  stats,
  isLoading,
}: DeliveryPerformanceProps) => {
  const metrics = stats ? computeMetrics(stats) : [];

  let body;
  if (isLoading) {
    body = (
      <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
        Loading...
      </div>
    );
  } else if (!stats || stats.length === 0) {
    body = (
      <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
        No delivery data yet
      </div>
    );
  } else {
    body = renderMetrics(metrics);
  }

  return (
    <CardBox className="p-5">
      <div className="flex items-center justify-between">
        <h5 className="card-title">Delivery performance</h5>
        <button className="text-sm text-primary hover:underline">
          View full analytics →
        </button>
      </div>

      {body}
    </CardBox>
  );
};

export default DeliveryPerformance;

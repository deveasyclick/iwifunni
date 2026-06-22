'use client';

import CardBox from '@/components/card/CardBox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ApexOptions } from 'apexcharts';
import dynamic from 'next/dynamic';
import { ACTIVITY_CHART_OPTIONS, TIME_RANGES } from '../constants';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

export interface ActivitiesProps {
  readonly data?: Array<{
    day: string;
    total: number;
    delivered: number;
  }>;
  readonly isLoading?: boolean;
  readonly days: number;
  readonly onDaysChange: (days: number) => void;
}

const baseChartOptions: ApexOptions = ACTIVITY_CHART_OPTIONS;

const Activities: React.FC<ActivitiesProps> = ({
  data,
  isLoading,
  days,
  onDaysChange,
}) => {
  const emptySeries = [
    { name: 'Sent', data: [] },
    { name: 'Delivered', data: [] },
  ];

  const series = data
    ? [
        { name: 'Sent', data: data.map((d) => d.total) },
        { name: 'Delivered', data: data.map((d) => d.delivered) },
      ]
    : emptySeries;

  const categories = data ? data.map((d) => d.day) : [];

  const chartOptions: ApexOptions = {
    ...baseChartOptions,
    xaxis: {
      ...baseChartOptions.xaxis,
      categories,
    },
  };

  if (isLoading) {
    return (
      <CardBox className="pb-0 h-full w-full rounded-2xl p-4">
        <div className="flex items-center justify-between mb-6">
          <h5 className="text-lg font-semibold">Activity</h5>
        </div>
        <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
          Loading...
        </div>
      </CardBox>
    );
  }

  const chartContent =
    data && data.length > 0 ? (
      <Chart
        options={chartOptions}
        series={series}
        type="line"
        height={200}
        width="100%"
      />
    ) : (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
        No activity data yet
      </div>
    );

  return (
    <CardBox className="pb-0 h-full w-full rounded-2xl p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h5 className="text-lg font-semibold">Activity</h5>
        </div>

        <Select
          value={String(days)}
          onValueChange={(v) => onDaysChange(Number(v))}
        >
          <SelectTrigger className="w-40 bg-transparent border border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIME_RANGES.map((r) => (
              <SelectItem key={r.value} value={String(r.value)}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {chartContent}
    </CardBox>
  );
};

export default Activities;

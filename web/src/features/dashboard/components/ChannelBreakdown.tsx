'use client';

import dynamic from 'next/dynamic';
import type { ApexOptions } from 'apexcharts';
import CardBox from '@/components/card/CardBox';
import { CHANNEL_COLORS, CHANNEL_LABELS } from '../constants';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface ChannelBreakdownProps {
  readonly data?: Array<{
    channel: string;
    count: number;
  }>;
  readonly isLoading?: boolean;
}

const ChannelBreakdown = ({ data, isLoading }: ChannelBreakdownProps) => {
  if (isLoading) {
    return (
      <CardBox className="rounded-2xl p-6 h-full">
        <h5 className="text-base font-semibold mb-6">Channel breakdown</h5>
        <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
          Loading...
        </div>
      </CardBox>
    );
  }

  if (!data || data.length === 0) {
    return (
      <CardBox className="rounded-2xl p-6 h-full">
        <h5 className="text-base font-semibold mb-6">Channel breakdown</h5>
        <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
          No data yet
        </div>
      </CardBox>
    );
  }

  const total = data.reduce((sum, d) => sum + d.count, 0);
  const sorted = [...data].sort((a, b) => b.count - a.count);

  const series = sorted.map((d) => Math.round((d.count / total) * 100));
  const labels = sorted.map((d) => CHANNEL_LABELS[d.channel] || d.channel);
  const colors = sorted.map((d) => CHANNEL_COLORS[d.channel] || '#5d87ff');

  const chartOptions: ApexOptions = {
    chart: {
      type: 'donut',
      fontFamily: 'inherit',
      foreColor: '#AAB4C5',
    },
    labels,
    colors,
    stroke: { show: false },
    dataLabels: { enabled: false },
    legend: { show: false },
    plotOptions: {
      pie: {
        donut: {
          size: '78%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total',
              color: '#94A3B8',
              fontSize: '12px',
              formatter: () => total.toLocaleString(),
            },
          },
        },
      },
    },
    tooltip: {
      theme: 'dark',
      y: {
        formatter: (val) => `${val}%`,
      },
    },
  };

  return (
    <CardBox className="rounded-2xl p-6 h-full">
      <h5 className="text-base font-semibold mb-6">Channel breakdown</h5>

      <div className="flex items-center justify-between gap-6">
        {/* Donut */}
        <div className="relative">
          <Chart
            options={chartOptions}
            series={series}
            type="donut"
            height={220}
          />
          {/* subtle glow */}
          <div className="absolute inset-0 blur-2xl opacity-20 bg-primary rounded-full"></div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-4 text-sm w-full max-w-45">
          {sorted.map((d) => {
            const pct = Math.round((d.count / total) * 100);
            const countDisplay =
              d.count >= 1000
                ? `${(d.count / 1000).toFixed(1).replace(/\.0$/, '')}k`
                : String(d.count);
            return (
              <div
                key={d.channel}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full`}
                    style={{
                      backgroundColor: CHANNEL_COLORS[d.channel] || '#5d87ff',
                    }}
                  ></span>
                  <span className="text-gray-200">
                    {CHANNEL_LABELS[d.channel] || d.channel}
                  </span>
                </div>
                <span className="text-gray-400">
                  {pct}% ({countDisplay})
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </CardBox>
  );
};

export default ChannelBreakdown;

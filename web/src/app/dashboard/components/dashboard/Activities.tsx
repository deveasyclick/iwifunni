'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ApexOptions } from 'apexcharts';
import CardBox from '@/app/components/shared/CardBox';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

const chartDataByRange = {
  'Last 7 days': {
    series: [
      {
        name: 'Sent',
        data: [800, 1900, 1300, 2200, 3400, 2000, 3300, 2400],
      },
      {
        name: 'Delivered',
        data: [400, 1000, 700, 1200, 2200, 1300, 2100, 1700],
      },
    ],
    categories: [
      'May 12',
      'May 13',
      'May 14',
      'May 15',
      'May 16',
      'May 17',
      'May 18',
    ],
  },
};

const baseChartOptions: ApexOptions = {
  chart: {
    type: 'line',
    toolbar: { show: false },
    foreColor: '#AAB4C5',
    fontFamily: 'inherit',
    height: 320,
  },
  stroke: {
    curve: 'smooth',
    width: 3,
  },
  colors: ['#3B82F6', '#22C55E'], // blue & green
  markers: {
    size: 5,
    strokeWidth: 0,
    hover: { size: 7 },
  },
  grid: {
    borderColor: 'rgba(255,255,255,0.08)',
    strokeDashArray: 4,
  },
  legend: {
    show: true,
    position: 'top',
    horizontalAlign: 'left',
  },
  dataLabels: { enabled: false },
  xaxis: {
    axisBorder: { show: false },
    axisTicks: { show: false },
  },
  yaxis: {
    min: 0,
    max: 4000,
    tickAmount: 4,
    labels: {
      formatter: (val) => `${val / 1000}k`,
    },
  },
  tooltip: {
    theme: 'dark',
    y: {
      formatter: (val) => `${val}`,
    },
  },
};
type Range = keyof typeof chartDataByRange;
const Activities: React.FC = () => {
  const [range, setRange] = useState<Range>('Last 7 days');

  const chartOptions: ApexOptions = {
    ...baseChartOptions,
    xaxis: {
      ...baseChartOptions.xaxis,
      categories: chartDataByRange[range].categories,
    },
  };

  return (
    <CardBox className="pb-0 h-full w-full text-white rounded-2xl p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h5 className="text-lg font-semibold">Activity</h5>
        </div>

        <Select value={range} onValueChange={(val: Range) => setRange(val)}>
          <SelectTrigger className="w-35 bg-transparent border border-border text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(chartDataByRange).map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Chart
        options={chartOptions}
        series={chartDataByRange[range].series}
        type="line"
        height={200}
        width="100%"
      />
    </CardBox>
  );
};

export default Activities;

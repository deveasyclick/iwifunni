import type { ApexOptions } from 'apexcharts';

export const ACTIVITY_CHART_OPTIONS: ApexOptions = {
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
  colors: ['#3B82F6', '#22C55E'],
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
    labels: {
      formatter: (val) =>
        `${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`,
    },
  },
  tooltip: {
    theme: 'dark',
    y: {
      formatter: (val) => `${val}`,
    },
  },
};

export const CHANNEL_COLORS: Record<string, string> = {
  email: '#13deb9',
  sms: '#f6b51e',
  push: '#8754ec',
  in_app: '#5d87ff',
};

export const CHANNEL_LABELS: Record<string, string> = {
  email: 'Email',
  sms: 'SMS',
  push: 'Push',
  in_app: 'In-App',
};

export const STATUS_BADGE: Record<string, string> = {
  sent: 'bg-success text-white',
  failed: 'bg-error text-white',
  partial_failed: 'bg-warning text-white',
  partial_skipped: 'bg-muted text-muted-foreground',
  skipped: 'bg-muted text-muted-foreground',
  pending: 'bg-info text-white',
};

export const STATUS_LABEL: Record<string, string> = {
  sent: 'Delivered',
  failed: 'Failed',
  partial_failed: 'Partial',
  partial_skipped: 'Partial',
  skipped: 'Skipped',
  pending: 'Pending',
};

export const TIME_RANGES = [
  { value: 7, label: 'Last 7 days' },
  { value: 14, label: 'Last 14 days' },
  { value: 30, label: '1 month' },
  { value: 90, label: '3 months' },
  { value: 180, label: '6 months' },
] as const satisfies readonly { value: number; label: string }[];

export type TimeRangeDays = (typeof TIME_RANGES)[number]['value'];

export interface StatCardDef {
  readonly key: string;
  readonly title: string;
  readonly icon: string;
  readonly bgcolor: string;
  readonly textclr: string;
  readonly format?: (n: number) => string;
}

export const STAT_CARDS: StatCardDef[] = [
  {
    key: 'notifications',
    title: 'Notifications',
    icon: 'system-uicons:notification',
    bgcolor: 'bg-info/10 dark:bg-info/10',
    textclr: 'text-info dark:text-info',
    format: (n) => {
      if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
      return String(n);
    },
  },
  {
    key: 'subscribers',
    title: 'Subscribers',
    icon: 'heroicons:users',
    bgcolor: 'bg-warning/10 dark:bg-warning/10',
    textclr: 'text-warning dark:text-warning',
    format: (n) => {
      if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
      return String(n);
    },
  },
  {
    key: 'workflows',
    title: 'Workflows',
    icon: 'material-symbols:graph-1',
    bgcolor: 'bg-secondary/10 dark:bg-secondary/10',
    textclr: 'text-secondary dark:text-secondary',
  },
  {
    key: 'providers',
    title: 'Providers',
    icon: 'mdi:plug-socket',
    bgcolor: 'bg-success/10 dark:bg-success/10',
    textclr: 'text-success dark:text-success',
  },
];

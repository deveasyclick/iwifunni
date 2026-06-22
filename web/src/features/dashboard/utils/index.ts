export function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

export function formatCount(n: number): string {
  if (n >= 1000) {
    return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return String(n);
}

export interface DeliveryMetric {
  readonly label: string;
  readonly value: string;
  readonly change: string;
  readonly trend: 'up' | 'down';
}

export function computeMetrics(
  stats: Array<{ status: string; count: number }>,
): DeliveryMetric[] {
  const total = stats.reduce((sum, s) => sum + s.count, 0);
  if (total === 0) {
    return [
      { label: 'Delivery rate', value: '—', change: '', trend: 'up' },
      { label: 'Failed', value: '—', change: '', trend: 'down' },
      { label: 'Bounced', value: '—', change: '', trend: 'down' },
      { label: 'Spam complaints', value: '—', change: '', trend: 'up' },
    ];
  }

  const sent = stats
    .filter((s) => s.status === 'sent' || s.status === 'partial_failed')
    .reduce((sum, s) => sum + s.count, 0);
  const failed = stats
    .filter((s) => s.status === 'failed')
    .reduce((sum, s) => sum + s.count, 0);

  const deliveryRate = ((sent / total) * 100).toFixed(1);
  const failedRate = ((failed / total) * 100).toFixed(1);

  return [
    {
      label: 'Delivery rate',
      value: `${deliveryRate}%`,
      change: '',
      trend: 'up',
    },
    { label: 'Failed', value: `${failedRate}%`, change: '', trend: 'down' },
    { label: 'Bounced', value: '0.0%', change: '', trend: 'down' },
    { label: 'Spam complaints', value: '0.0%', change: '', trend: 'up' },
  ];
}

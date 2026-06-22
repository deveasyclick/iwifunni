export type DashboardStatsResponse = {
  counts: {
    total_notifications: number;
    total_subscribers: number;
    total_workflows: number;
    active_providers: number;
  };
  notification_stats: Array<{
    status: string;
    count: number;
  }>;
  daily_activity: Array<{
    day: string;
    total: number;
    delivered: number;
  }>;
  channel_breakdown: Array<{
    channel: string;
    count: number;
  }>;
  recent_notifications: Array<{
    id: string;
    title: string;
    message: string;
    channels: string[];
    status: string;
    created_at: string;
  }>;
  active_providers: Array<{
    name: string;
    channel: string;
  }>;
};

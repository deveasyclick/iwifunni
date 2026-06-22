import { request } from '@/lib/api-client';
import type { DashboardStatsResponse } from './types';

export const dashboardApi = {
  getStats(days?: number) {
    const params = days ? `?days=${days}` : '';
    return request<DashboardStatsResponse>(`/api/stats${params}`, {
      method: 'GET',
    });
  },
};

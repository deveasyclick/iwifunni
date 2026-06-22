import { request } from '@/lib/api-client';
import type { DashboardStatsResponse } from './types';

export const dashboardApi = {
  getStats() {
    return request<DashboardStatsResponse>('/api/stats', {
      method: 'GET',
    });
  },
};

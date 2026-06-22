'use client';

import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from './api';
import type { DashboardStatsResponse } from './types';

export function useDashboardStats(days?: number) {
  return useQuery<DashboardStatsResponse>({
    queryKey: ['dashboard-stats', days],
    queryFn: () => dashboardApi.getStats(days),
    staleTime: 30_000,
  });
}

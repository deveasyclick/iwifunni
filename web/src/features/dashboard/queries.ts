'use client';

import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from './api';
import type { DashboardStatsResponse } from './types';

export function useDashboardStats() {
  return useQuery<DashboardStatsResponse>({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardApi.getStats(),
    staleTime: 30_000,
  });
}

'use client';

import { useQuery } from '@tanstack/react-query';
import { notificationApi } from './api';

export function useNotificationList() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationApi.listNotifications(),
    staleTime: 30_000,
  });
}

export function useNotification(id: string) {
  return useQuery({
    queryKey: ['notifications', id],
    queryFn: () => notificationApi.getNotification(id),
    enabled: !!id,
    staleTime: 15_000,
  });
}

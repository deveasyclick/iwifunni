import { request } from '@/lib/api-client';
import type { NotificationType } from '@/app/types/notification';

export const notificationApi = {
  listNotifications() {
    return request<NotificationType[]>('/api/notifications', { method: 'GET' });
  },

  getNotification(id: string) {
    return request<NotificationType>(`/api/notifications/${id}`, {
      method: 'GET',
    });
  },
};

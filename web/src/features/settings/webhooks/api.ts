import { request } from '@/lib/api-client';
import type { WebhookItem, CreateWebhookPayload } from '@/app/types/webhook';

export const webhookApi = {
  listWebhooks() {
    return request<WebhookItem[]>('/api/webhooks', { method: 'GET' });
  },

  createWebhook(payload: CreateWebhookPayload) {
    return request<WebhookItem>('/api/webhooks', {
      method: 'POST',
      body: payload,
    });
  },

  deleteWebhook(id: string) {
    return request<void>(`/api/webhooks/${id}`, { method: 'DELETE' });
  },
};

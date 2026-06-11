import { request } from '@/lib/api-client';
import type {
  CreateSubscriberPayload,
  SubscriberApiResponse,
  SubscriberType,
} from '@/app/types/subscriber';

export const subscriberApi = {
  listSubscribers() {
    return request<SubscriberApiResponse<SubscriberType[]>>('/api/subscriber', {
      method: 'GET',
    });
  },

  getSubscriber(id: string) {
    return request<SubscriberApiResponse<SubscriberType>>(
      `/api/subscriber/${encodeURIComponent(id)}`,
      { method: 'GET' },
    );
  },

  createSubscriber(payload: CreateSubscriberPayload) {
    return request<SubscriberApiResponse<SubscriberType>>('/api/subscriber', {
      method: 'POST',
      body: payload,
    });
  },

  updateSubscriber(id: string, payload: CreateSubscriberPayload) {
    return request<SubscriberApiResponse<SubscriberType>>(
      `/api/subscriber/${encodeURIComponent(id)}`,
      { method: 'PUT', body: payload },
    );
  },

  deleteSubscriber(id: string) {
    return request<void>(`/api/subscriber/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  searchSubscribers(query: string) {
    return request<SubscriberApiResponse<SubscriberType[]>>(
      `/api/subscriber?search=${encodeURIComponent(query)}`,
      { method: 'GET' },
    );
  },
};

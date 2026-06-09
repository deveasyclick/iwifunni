import { request } from '@/lib/api-client';

export const subscriberApi = {
  searchSubscribers(query: string) {
    return request<
      Array<{
        id: string;
        name: string;
        email?: string;
        phone?: string;
      }>
    >(`/api/subscriber?search=${encodeURIComponent(query)}`, {
      method: 'GET',
    });
  },
};

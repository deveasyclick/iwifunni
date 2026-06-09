import { request } from '@/lib/api-client';

export interface ProviderConfig {
  id: string;
  name: string;
  channel: string;
  config?: { sender_name?: string; from_email?: string };
  is_primary: boolean;
}

export const providerApi = {
  listProviders() {
    return request<ProviderConfig[]>('/api/providers', { method: 'GET' });
  },
};

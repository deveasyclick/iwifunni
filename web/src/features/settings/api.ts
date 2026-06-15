import type {
  CreateProviderPayload,
  ProviderItem,
  UpdateProviderStatePayload,
} from '@/app/types/provider';
import { request } from '@/lib/api-client';

export interface ProviderConfig {
  id: string;
  name: string;
  channel: string;
  config?: { sender_name?: string; from_email?: string };
  is_primary: boolean;
  is_active: boolean;
}

export const providerApi = {
  listProviders() {
    return request<ProviderItem[]>('/api/providers', { method: 'GET' });
  },

  createProvider(payload: CreateProviderPayload) {
    return request<ProviderItem>('/api/providers', {
      method: 'POST',
      body: payload,
    });
  },

  updateProvider(id: string, payload: CreateProviderPayload) {
    return request<ProviderItem>(`/api/providers/${id}`, {
      method: 'PUT',
      body: payload,
    });
  },

  updateProviderState(id: string, payload: UpdateProviderStatePayload) {
    return request<ProviderItem>(`/api/providers/${id}`, {
      method: 'PATCH',
      body: payload,
    });
  },
};

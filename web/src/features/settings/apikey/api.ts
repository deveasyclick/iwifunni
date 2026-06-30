import type {
  ApiKeyItem,
  ApiKeySecretResponse,
  CreateApiKeyPayload,
} from '@/app/types/apikey';
import { request } from '@/lib/api-client';

export const apiKeyApi = {
  listKeys() {
    return request<ApiKeyItem[]>('/api/apikeys', { method: 'GET' });
  },

  createKey(payload: CreateApiKeyPayload) {
    return request<ApiKeySecretResponse>('/api/apikeys', {
      method: 'POST',
      body: payload,
    });
  },

  deleteKey(id: string) {
    return request<void>(`/api/apikeys/${id}`, { method: 'DELETE' });
  },
};

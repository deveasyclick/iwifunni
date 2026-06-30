import { request } from '@/lib/api-client';
import type {
  ApiKeyItem,
  ApiKeySecretResponse,
  CreateApiKeyPayload,
} from '@/app/types/api-key';

export const apiKeyApi = {
  listKeys() {
    return request<ApiKeyItem[]>('/api/api-keys', { method: 'GET' });
  },

  createKey(payload: CreateApiKeyPayload) {
    return request<ApiKeySecretResponse>('/api/api-keys', {
      method: 'POST',
      body: payload,
    });
  },

  deleteKey(id: string) {
    return request<void>(`/api/api-keys/${id}`, { method: 'DELETE' });
  },
};

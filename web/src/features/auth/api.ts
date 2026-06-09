import { request } from '@/lib/api-client';

export const authApi = {
  getUserProfile() {
    return request<{
      id: string;
      email: string;
      first_name: string;
      last_name: string;
    }>('/api/auth/me', { method: 'GET' });
  },
};

'use client';

import { useQuery } from '@tanstack/react-query';
import { authApi } from './api';

export function useUserProfile() {
  return useQuery({
    queryKey: ['user-profile'],
    queryFn: authApi.getUserProfile,
    staleTime: 60_000,
  });
}

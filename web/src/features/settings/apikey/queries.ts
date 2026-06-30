'use client';

import type { CreateApiKeyPayload } from '@/app/types/apikey';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiKeyApi } from './api';

export function useApiKeyList() {
  return useQuery({
    queryKey: ['apikeys'],
    queryFn: () => apiKeyApi.listKeys(),
    staleTime: 60_000,
  });
}

function invalidateKeys(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['apikeys'] });
}

export function useCreateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateApiKeyPayload) => apiKeyApi.createKey(payload),
    onSuccess: () => invalidateKeys(queryClient),
  });
}

export function useDeleteApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiKeyApi.deleteKey(id),
    onSuccess: () => invalidateKeys(queryClient),
  });
}

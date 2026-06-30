'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiKeyApi } from './api';
import type { CreateApiKeyPayload } from '@/app/types/api-key';

export function useApiKeyList() {
  return useQuery({
    queryKey: ['api-keys'],
    queryFn: () => apiKeyApi.listKeys(),
    staleTime: 60_000,
  });
}

function invalidateKeys(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['api-keys'] });
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



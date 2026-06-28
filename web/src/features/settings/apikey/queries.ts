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

export function useRotateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiKeyApi.rotateKey(id),
    onSuccess: () => invalidateKeys(queryClient),
  });
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiKeyApi.revokeKey(id),
    onSuccess: () => invalidateKeys(queryClient),
  });
}

export function useUpdateApiKeyStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiKeyApi.updateKeyStatus(id, status),
    onSuccess: () => invalidateKeys(queryClient),
  });
}

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

export function useCreateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateApiKeyPayload) => apiKeyApi.createKey(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });
}

export function useRotateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiKeyApi.rotateKey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiKeyApi.revokeKey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });
}

export function useUpdateApiKeyStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiKeyApi.updateKeyStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });
}

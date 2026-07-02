'use client';

import type {
  CreateProviderPayload,
  UpdateProviderStatePayload,
} from '@/app/types/provider';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { providerApi, type ProviderConfig } from './api';

export function useProviders() {
  return useQuery({
    queryKey: ['providers'],
    queryFn: () => providerApi.listProviders(),
    staleTime: 60_000,
  });
}

export function useEmailProvider() {
  const query = useProviders();

  const emailProvider: ProviderConfig | null =
    query.data?.find((p) => p.channel === 'email') ||
    query.data?.find((p) => p.config?.sender_name || p.config?.from_email) ||
    null;

  return {
    provider: emailProvider,
    loading: query.isLoading,
    error: query.error,
  };
}

export function useSmsProvider() {
  const query = useProviders();

  const smsProvider: ProviderConfig | null =
    query.data?.find((p) => p.channel === 'sms' && p.is_primary) ||
    query.data?.find((p) => p.channel === 'sms' && p.is_active) ||
    null;

  // Derive a display sender from provider config
  const senderId =
    smsProvider?.config?.sender_id || smsProvider?.config?.from_number || '';

  return {
    provider: smsProvider,
    loading: query.isLoading,
    error: query.error,
    senderId,
    hasProvider: !!smsProvider,
  };
}

export function useCreateProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateProviderPayload) =>
      providerApi.createProvider(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['providers'] }),
  });
}

export function useUpdateProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: CreateProviderPayload;
    }) => providerApi.updateProvider(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['providers'] }),
  });
}

export function useUpdateProviderState() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateProviderStatePayload;
    }) => providerApi.updateProviderState(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['providers'] }),
  });
}

export function useDeleteProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => providerApi.deleteProvider(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['providers'] }),
  });
}

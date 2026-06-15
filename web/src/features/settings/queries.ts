'use client';

import { useQuery } from '@tanstack/react-query';
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

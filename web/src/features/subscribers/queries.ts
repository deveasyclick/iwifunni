'use client';

import { useQuery } from '@tanstack/react-query';
import { subscriberApi } from './api';

export function useSubscriberSearch(query: string) {
  return useQuery({
    queryKey: ['subscribers', 'search', query],
    queryFn: () => subscriberApi.searchSubscribers(query),
    enabled: query.trim().length > 0,
    staleTime: 30_000,
  });
}

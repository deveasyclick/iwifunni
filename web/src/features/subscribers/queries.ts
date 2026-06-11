'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { subscriberApi } from './api';
import type {
  CreateSubscriberPayload,
  SubscriberType,
} from '@/app/types/subscriber';

export function useSubscriberList() {
  return useQuery({
    queryKey: ['subscribers'],
    queryFn: async () => {
      const result = await subscriberApi.listSubscribers();
      return result.data;
    },
    staleTime: 30_000,
  });
}

export type SubscriberListResult = SubscriberType[];

export function useSubscriberDetail(id: string) {
  return useQuery({
    queryKey: ['subscribers', id],
    queryFn: async () => {
      const result = await subscriberApi.getSubscriber(id);
      return result.data;
    },
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useSubscriberCreate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateSubscriberPayload) =>
      subscriberApi.createSubscriber(payload),
    onSuccess: () => {
      queryClient
        .invalidateQueries({ queryKey: ['subscribers'] })
        .catch((err) => console.log(err));
    },
  });
}

export function useSubscriberUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: CreateSubscriberPayload;
    }) => subscriberApi.updateSubscriber(id, payload),
    onSuccess: (_data, variables) => {
      queryClient
        .invalidateQueries({ queryKey: ['subscribers'] })
        .catch((err) => console.log(err));
      queryClient
        .invalidateQueries({
          queryKey: ['subscribers', variables.id],
        })
        .catch((err) => console.log(err));
    },
  });
}

export function useSubscriberDelete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => subscriberApi.deleteSubscriber(id),
    onSuccess: () => {
      queryClient
        .invalidateQueries({ queryKey: ['subscribers'] })
        .catch((err) => console.log(err));
    },
  });
}

export function useSubscriberSearch(query: string) {
  return useQuery({
    queryKey: ['subscribers', 'search', query],
    queryFn: async () => {
      const result = await subscriberApi.searchSubscribers(query);
      return result.data;
    },
    enabled: query.trim().length > 0,
    staleTime: 30_000,
  });
}

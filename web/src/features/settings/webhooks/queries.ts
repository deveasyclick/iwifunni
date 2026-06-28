'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { webhookApi } from './api';
import type { CreateWebhookPayload } from '@/app/types/webhook';

function invalidateWebhooks(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['webhooks'] });
}

export function useWebhookList() {
  return useQuery({
    queryKey: ['webhooks'],
    queryFn: () => webhookApi.listWebhooks(),
    staleTime: 60_000,
  });
}

export function useCreateWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateWebhookPayload) =>
      webhookApi.createWebhook(payload),
    onSuccess: () => invalidateWebhooks(queryClient),
  });
}

export function useDeleteWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => webhookApi.deleteWebhook(id),
    onSuccess: () => invalidateWebhooks(queryClient),
  });
}

'use client';

import type { WorkflowItem } from '@/app/types/workflow';
import { useMutation, useQuery } from '@tanstack/react-query';
import { workflowApi } from './api';
import type {
  NotificationPollResponse,
  TestSendPayload,
  TriggerWorkflowPayload,
  TriggerWorkflowResponse,
} from './types/api';

export function useWorkflowListQuery() {
  return useQuery<WorkflowItem[]>({
    queryKey: ['workflows'],
    queryFn: () => workflowApi.getWorkflows(),
    staleTime: 30_000,
  });
}

export function useWorkflowQuery(workflowId: string) {
  return useQuery({
    queryKey: ['workflow', workflowId],
    queryFn: () => workflowApi.getWorkflow(workflowId),
    staleTime: 30_000,
  });
}

export function useTestSend() {
  return useMutation({
    mutationFn: (payload: TestSendPayload) => workflowApi.testSend(payload),
  });
}

export function useWorkflowActivitiesQuery(workflowId: string) {
  return useQuery({
    queryKey: ['workflow-activities', workflowId],
    queryFn: () => workflowApi.getActivities(workflowId),
    enabled: !!workflowId,
    staleTime: 10_000,
  });
}

export function useWorkflowTrigger() {
  return useMutation<TriggerWorkflowResponse, Error, TriggerWorkflowPayload>({
    mutationFn: (payload: TriggerWorkflowPayload) =>
      workflowApi.triggerWorkflow(payload),
  });
}

export function useNotificationPollQuery(notificationId: string | undefined) {
  return useQuery<NotificationPollResponse>({
    queryKey: ['notification-poll', notificationId],
    queryFn: () => workflowApi.pollNotification(notificationId!),
    enabled: !!notificationId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 2000;
      const status = data.notification?.status;
      if (
        status &&
        [
          'sent',
          'failed',
          'partial_failed',
          'partial_skipped',
          'skipped',
        ].includes(status)
      ) {
        return false;
      }
      return 2000;
    },
    staleTime: 0,
  });
}

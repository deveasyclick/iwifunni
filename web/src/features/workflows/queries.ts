'use client';

import type { WorkflowItem } from '@/app/types/workflow';
import { useMutation, useQuery } from '@tanstack/react-query';
import { workflowApi, type TestSendPayload } from './api';

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

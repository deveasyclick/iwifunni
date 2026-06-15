'use client';

import type { WorkflowItem } from '@/app/types/workflow';
import { useQuery } from '@tanstack/react-query';
import { workflowApi } from './api';

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

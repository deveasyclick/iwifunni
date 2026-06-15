'use client';

import { useQuery } from '@tanstack/react-query';
import { workflowApi } from './api';
import type { WorkflowItem } from '@/app/types/workflow';

export function useWorkflowListQuery() {
  return useQuery<WorkflowItem[]>({
    queryKey: ['workflows'],
    queryFn: () => workflowApi.getWorkflows(),
    staleTime: 30_000,
  });
}

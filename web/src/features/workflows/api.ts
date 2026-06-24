import type { CreateTemplatePayload, TemplateItem } from '@/app/types/template';
import type {
  CreateWorkflowPayload,
  WorkflowExecutionDetail,
  WorkflowExecutionItem,
  WorkflowItem,
} from '@/app/types/workflow';
import type {
  NotificationPollResponse,
  TemplateUpdatePayload,
  TestSendPayload,
  TestSendResponse,
  TriggerWorkflowPayload,
  TriggerWorkflowResponse,
  WorkflowEventPayload,
} from './types/api';
import { request } from '@/lib/api-client';

export const workflowApi = {
  archiveWorkflow(id: string) {
    return request<void>(`/api/workflows/${id}`, { method: 'DELETE' });
  },
  createWorkflow(payload: CreateWorkflowPayload) {
    return request<WorkflowItem>('/api/workflows', {
      method: 'POST',
      body: payload,
    });
  },
  getWorkflow(id: string) {
    return request<WorkflowItem>(`/api/workflows/${id}`, { method: 'GET' });
  },
  getExecution(id: string) {
    return request<WorkflowExecutionDetail>(`/api/workflow-executions/${id}`, {
      method: 'GET',
    });
  },
  getExecutions(workflowID?: string) {
    const search =
      workflowID && workflowID !== 'all'
        ? `?workflow_id=${encodeURIComponent(workflowID)}`
        : '';
    return request<WorkflowExecutionItem[]>(
      `/api/workflow-executions${search}`,
      { method: 'GET' },
    );
  },
  getWorkflows() {
    return request<WorkflowItem[]>('/api/workflows', { method: 'GET' });
  },
  updateWorkflow(id: string, payload: CreateWorkflowPayload) {
    return request<WorkflowItem>(`/api/workflows/${id}`, {
      method: 'PUT',
      body: payload,
    });
  },
  publishWorkflow(id: string) {
    return request<void>(`/api/workflows/${id}/publish`, { method: 'POST' });
  },
  triggerEvent(payload: WorkflowEventPayload) {
    return request<void>('/api/events', {
      method: 'POST',
      body: payload,
    });
  },
  getTemplate(id: string) {
    return request<TemplateItem>(`/api/templates/${id}`, { method: 'GET' });
  },
  updateTemplate(id: string, payload: TemplateUpdatePayload) {
    return request<TemplateItem>(`/api/templates/${id}`, {
      method: 'PATCH',
      body: payload,
    });
  },
  upsertTemplate(payload: CreateTemplatePayload) {
    return request<TemplateItem>('/api/templates/upsert', {
      method: 'POST',
      body: payload,
    });
  },
  testSend(payload: TestSendPayload) {
    return request<TestSendResponse>('/api/notifications/test-send', {
      method: 'POST',
      body: payload,
    });
  },

  getActivities(workflowId: string) {
    return request<import('@/app/types/notification').NotificationType[]>(
      `/api/workflows/${workflowId}/activities`,
      { method: 'GET' },
    );
  },

  triggerWorkflow(payload: TriggerWorkflowPayload) {
    return request<TriggerWorkflowResponse>('/api/notifications/trigger', {
      method: 'POST',
      body: payload,
    });
  },

  pollNotification(notificationId: string) {
    return request<NotificationPollResponse>(
      `/api/notifications/${notificationId}/poll`,
      { method: 'GET' },
    );
  },
};

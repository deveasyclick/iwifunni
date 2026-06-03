import type { WorkflowSetupValues } from '../schema/workflow-setup';

export const buildWorkflowBuilderHref = (
  values?: Partial<WorkflowSetupValues> & { workflowId?: string },
) => {
  const params = new URLSearchParams();
  if (values?.workflowId?.trim()) {
    params.set('workflowId', values.workflowId.trim());
  }
  if (values?.name?.trim()) {
    params.set('name', values.name.trim());
  }
  if (values?.description?.trim()) {
    params.set('description', values.description.trim());
  }

  const query = params.toString();
  return query
    ? `/dashboard/workflows/new/builder?${params.toString()}`
    : '/dashboard/workflows/new/builder';
};

export const buildWorkflowSetupHref = (
  values: Partial<WorkflowSetupValues>,
) => {
  const params = new URLSearchParams();
  if (values.name?.trim()) {
    params.set('name', values.name.trim());
  }
  if (values.description?.trim()) {
    params.set('description', values.description.trim());
  }

  const query = params.toString();
  return query
    ? `/dashboard/workflows/new?${query}`
    : '/dashboard/workflows/new';
};

export const buildWorkflowChannelConfigureHref = (
  workflowId: string,
  nodeId: string,
  channel?: string,
) => {
  const params = new URLSearchParams();
  params.set('workflowId', workflowId);
  params.set('nodeId', nodeId);
  if (channel) {
    params.set('channel', channel);
  }

  return `/dashboard/workflows/new/builder/channel?${params.toString()}`;
};

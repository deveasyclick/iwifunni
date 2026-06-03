import type { Metadata } from 'next';
import BreadcrumbComp from '../../../../layout/shared/breadcrumb/BreadcrumbComp';
import ConfigureWorkflowChannel from '../../../../components/workflows/configure-workflow-channel';
import {
  buildWorkflowBuilderHref,
  buildWorkflowChannelConfigureHref,
} from '../../../../components/workflows/utils/urls';
import { workflowIdFromRecord } from '../../../../components/workflows/utils/search-params';

export const metadata: Metadata = {
  title: 'Configure Channel',
};

type WorkflowChannelPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const firstValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] || '' : value || '';

const channelStepLabel = (channel: string): string => {
  switch (channel.toLowerCase()) {
    case 'email':
      return 'Email step';
    case 'sms':
      return 'SMS step';
    case 'push':
      return 'Push step';
    default:
      return 'Configure Channel';
  }
};

const WorkflowChannelPage = async ({
  searchParams,
}: WorkflowChannelPageProps) => {
  const params = await searchParams;
  const workflowId = workflowIdFromRecord(params);
  const nodeId = firstValue(params.nodeId);
  const channel = firstValue(params.channel);
  const stepLabel = channelStepLabel(channel);
  const breadcrumbItems = [
    {
      to: '/dashboard/workflows',
      title: 'Workflows',
    },
    {
      to: buildWorkflowBuilderHref({ workflowId }),
      title: 'Workflow Builder',
    },
    {
      to: buildWorkflowChannelConfigureHref(workflowId, nodeId, channel),
      title: stepLabel,
    },
  ];

  return (
    <>
      <BreadcrumbComp title={stepLabel} items={breadcrumbItems} />
      <ConfigureWorkflowChannel workflowId={workflowId} nodeId={nodeId} />
    </>
  );
};

export default WorkflowChannelPage;

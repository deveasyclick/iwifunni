import type { Metadata } from 'next';
import ConfigureWorkflowChannel from '../../../../../../features/workflows/configure/ConfigureWorkflowChannel';
import { workflowIdFromRecord } from '../../../../../../features/workflows/utils/search-params';

export const metadata: Metadata = {
  title: 'Configure Channel',
};

type WorkflowChannelPageProps = {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const firstValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] || '' : value || '';

const WorkflowChannelPage = async ({
  searchParams,
}: WorkflowChannelPageProps) => {
  const params = await searchParams;
  const workflowId = workflowIdFromRecord(params);
  const nodeId = firstValue(params.nodeId);

  return <ConfigureWorkflowChannel workflowId={workflowId} nodeId={nodeId} />;
};

export default WorkflowChannelPage;

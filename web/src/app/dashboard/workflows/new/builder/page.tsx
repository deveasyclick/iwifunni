import type { Metadata } from 'next';
import { workflowIdFromRecord } from '../../../../../features/workflows/utils/search-params';
import WorkflowBuilderShell from './WorkflowBuilderShell';

export const metadata: Metadata = {
  title: 'Workflow Builder',
};

type WorkflowBuilderPageProps = {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const WorkflowBuilderPage = async ({
  searchParams,
}: WorkflowBuilderPageProps) => {
  const params = await searchParams;
  const workflowId = workflowIdFromRecord(params);
  const openTrigger = params.trigger === 'true';

  return (
    <WorkflowBuilderShell workflowId={workflowId} openTrigger={openTrigger} />
  );
};

export default WorkflowBuilderPage;

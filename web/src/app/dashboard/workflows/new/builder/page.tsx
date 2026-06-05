import type { Metadata } from 'next';
import BreadcrumbComp from '../../../layout/shared/breadcrumb/BreadcrumbComp';
import CreateWorkflowBuilder from '../../../../../features/workflows/components/CreateWorkflowBuilder';
import { buildWorkflowBuilderHref } from '../../../../../features/workflows/utils/urls';
import { workflowIdFromRecord } from '../../../../../features/workflows/utils/search-params';
import { workflowApi } from '../../../../../features/workflows/api';

export const metadata: Metadata = {
  title: 'Workflow Builder',
};

type WorkflowBuilderPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const WorkflowBuilderPage = async ({
  searchParams,
}: WorkflowBuilderPageProps) => {
  const params = await searchParams;
  const workflowId = workflowIdFromRecord(params);

  let workflowName = 'Workflow Builder';
  try {
    const workflow = await workflowApi.getWorkflow(workflowId);
    workflowName = workflow.name;
  } catch {
    // fall back to default title
  }

  const breadcrumbItems = [
    {
      to: '/dashboard/workflows',
      title: 'Workflows',
    },
    {
      to: buildWorkflowBuilderHref({ workflowId }),
      title: workflowName,
    },
  ];

  return (
    <>
      <BreadcrumbComp title={workflowName} items={breadcrumbItems} />
      <CreateWorkflowBuilder workflowId={workflowId} />
    </>
  );
};

export default WorkflowBuilderPage;

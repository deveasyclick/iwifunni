import type { Metadata } from 'next';
import BreadcrumbComp from '../../../layout/shared/breadcrumb/BreadcrumbComp';
import CreateWorkflowBuilder from '../../../components/workflows/create-workflow-builder';
import { buildWorkflowBuilderHref } from '../../../components/workflows/utils/urls';
import { workflowIdFromRecord } from '../../../components/workflows/utils/search-params';

export const metadata: Metadata = {
  title: 'Workflow Builder',
};

type WorkflowBuilderPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const WorkflowBuilderPage = async ({
  searchParams,
}: WorkflowBuilderPageProps) => {
  const workflowId = workflowIdFromRecord(await searchParams);
  const breadcrumbItems = [
    {
      to: '/dashboard/workflows',
      title: 'Workflows',
    },
    {
      to: buildWorkflowBuilderHref({ workflowId }),
      title: 'Workflow Builder',
    },
  ];

  return (
    <>
      <BreadcrumbComp title="Workflow Builder" items={breadcrumbItems} />
      <CreateWorkflowBuilder workflowId={workflowId} />
    </>
  );
};

export default WorkflowBuilderPage;

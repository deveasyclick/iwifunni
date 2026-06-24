import type { Metadata } from 'next';
import BreadcrumbComp from '../../../layout/shared/breadcrumb/BreadcrumbComp';
import { WorkflowActivitiesView } from '../../../../../features/workflows/components/WorkflowActivitiesView';
import { workflowApi } from '../../../../../features/workflows/api';

export const metadata: Metadata = {
  title: 'Workflow Activities',
};

type WorkflowActivitiesPageProps = {
  readonly params: Promise<{ id: string }>;
};

const WorkflowActivitiesPage = async ({
  params,
}: WorkflowActivitiesPageProps) => {
  const { id } = await params;

  let workflowName = 'Workflow Activities';
  try {
    const workflow = await workflowApi.getWorkflow(id);
    workflowName = workflow.name;
  } catch {
    // fall back to default title
  }

  const breadcrumbItems = [
    { to: '/dashboard/workflows', title: 'Workflows' },
    {
      to: `/dashboard/workflows/${id}/activities`,
      title: `${workflowName} — Activities`,
    },
  ];

  return (
    <>
      <BreadcrumbComp
        title={`${workflowName} — Activities`}
        items={breadcrumbItems}
      />
      <WorkflowActivitiesView workflowId={id} workflowName={workflowName} />
    </>
  );
};

export default WorkflowActivitiesPage;

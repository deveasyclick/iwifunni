import type { Metadata } from "next";
import BreadcrumbComp from "../../../layout/shared/breadcrumb/BreadcrumbComp";
import CreateWorkflowBuilder from "../../../components/workflows/create-workflow-builder";
import { workflowIdFromRecord } from "../../../components/workflows/create-workflow-metadata";

export const metadata: Metadata = {
  title: "Workflow Builder",
};

const BCrumb = [
  {
    to: "/dashboard/workflows",
    title: "Workflows",
  },
];

type WorkflowBuilderPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const WorkflowBuilderPage = async ({ searchParams }: WorkflowBuilderPageProps) => {
  const workflowId = workflowIdFromRecord(await searchParams);

  return (
    <>
      <BreadcrumbComp title="Workflow Builder" items={BCrumb} />
      <CreateWorkflowBuilder workflowId={workflowId} />
    </>
  );
};

export default WorkflowBuilderPage;
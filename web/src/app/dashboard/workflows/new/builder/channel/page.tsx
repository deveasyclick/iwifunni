import type { Metadata } from "next";
import BreadcrumbComp from "../../../../layout/shared/breadcrumb/BreadcrumbComp";
import ConfigureWorkflowChannel from "../../../../components/workflows/configure-workflow-channel";
import { workflowIdFromRecord } from "../../../../components/workflows/create-workflow-metadata";

export const metadata: Metadata = {
  title: "Configure Channel",
};

const BCrumb = [
  {
    to: "/dashboard/workflows",
    title: "Workflows",
  },
];

type WorkflowChannelPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const firstValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] || "" : value || "";

const WorkflowChannelPage = async ({ searchParams }: WorkflowChannelPageProps) => {
  const params = await searchParams;
  const workflowId = workflowIdFromRecord(params);
  const nodeId = firstValue(params.nodeId);

  return (
    <>
      <BreadcrumbComp title="Configure Channel" items={BCrumb} />
      <ConfigureWorkflowChannel workflowId={workflowId} nodeId={nodeId} />
    </>
  );
};

export default WorkflowChannelPage;
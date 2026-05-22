import type { Metadata } from "next";
import BreadcrumbComp from "../../layout/shared/breadcrumb/BreadcrumbComp";
import CreateWorkflow from "../../components/workflows/create-workflow";
import { buildWorkflowSetupHref } from "../../components/workflows/create-workflow-metadata";

export const metadata: Metadata = {
  title: "Create Workflow",
};

const BCrumb = [
  {
    to: "/dashboard/workflows",
    title: "Workflows",
  },
  {
    to: buildWorkflowSetupHref({}),
    title: "Workflow Setup",
  },
];

const CreateWorkflowPage = () => {
  return (
    <>
      <BreadcrumbComp title="Workflow Setup" items={BCrumb} />
      <CreateWorkflow />
    </>
  );
};

export default CreateWorkflowPage;

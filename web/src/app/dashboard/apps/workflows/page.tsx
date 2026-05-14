import type { Metadata } from "next";
import BreadcrumbComp from "../../layout/shared/breadcrumb/BreadcrumbComp";
import WorkflowManagement from "../../components/workflows";

export const metadata: Metadata = {
  title: "Workflows",
};

const BCrumb = [
  {
    to: "/",
    title: "Home",
  },
  {
    title: "Workflows",
  },
];

const WorkflowPage = () => {
  return (
    <>
      <BreadcrumbComp title="Workflows" items={BCrumb} />
      <WorkflowManagement />
    </>
  );
};

export default WorkflowPage;
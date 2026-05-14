import type { Metadata } from "next";
import BreadcrumbComp from "../../layout/shared/breadcrumb/BreadcrumbComp";
import TemplateManagement from "../../components/settings/templates";

export const metadata: Metadata = {
  title: "Settings - Templates",
};

const BCrumb = [
  {
    to: "/",
    title: "Home",
  },
  {
    to: "/dashboard/settings",
    title: "Settings",
  },
  {
    title: "Templates",
  },
];

const TemplateSettingsPage = () => {
  return (
    <>
      <BreadcrumbComp title="Templates" items={BCrumb} />
      <TemplateManagement />
    </>
  );
};

export default TemplateSettingsPage;
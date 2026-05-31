import type { Metadata } from "next";
import BreadcrumbComp from "../../layout/shared/breadcrumb/BreadcrumbComp";
import ProviderManagement from "../../components/settings/providers";

export const metadata: Metadata = {
  title: "Settings - Integrations",
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
    title: "Integrations",
  },
];

const IntegrationsSettingsPage = () => {
  return (
    <>
      <BreadcrumbComp title="Integrations" items={BCrumb} />
      <ProviderManagement />
    </>
  );
};

export default IntegrationsSettingsPage;

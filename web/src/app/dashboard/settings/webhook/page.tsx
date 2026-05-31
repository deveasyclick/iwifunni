import type { Metadata } from "next";
import BreadcrumbComp from "../../layout/shared/breadcrumb/BreadcrumbComp";
import WebhookManagement from "../../components/settings/webhooks";

export const metadata: Metadata = {
  title: "Settings - Webhooks",
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
    title: "Webhooks",
  },
];

const WebhookSettingsPage = () => {
  return (
    <>
      <BreadcrumbComp title="Webhooks" items={BCrumb} />
      <WebhookManagement />
    </>
  );
};

export default WebhookSettingsPage;

import type { Metadata } from "next";
import BreadcrumbComp from "../../layout/shared/breadcrumb/BreadcrumbComp";
import CardBox from "@/app/components/shared/CardBox";

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
      <CardBox className="p-6">
        <h5 className="card-title">Webhooks</h5>
        <p className="text-sm text-muted-foreground mt-2">
          Webhook management UI is coming next. This page is now connected to
          the updated Settings navigation.
        </p>
      </CardBox>
    </>
  );
};

export default WebhookSettingsPage;

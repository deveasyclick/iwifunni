"use client";

import Link from "next/link";
import CardBox from "@/app/components/shared/CardBox";
import { Icon } from "@iconify/react";

const IntegrationsCard = () => {
  return (
    <CardBox className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h5 className="card-title">Integrations</h5>
        <Link
          href="/dashboard/settings/integrations"
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          Manage
          <Icon icon="mdi:chevron-right" className="w-4 h-4" />
        </Link>
      </div>

      <div className="flex items-center gap-4 rounded-xl border border-border bg-muted/30 p-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-background">
          <Icon icon="simple-icons:sendgrid" className="h-6 w-6" />
        </div>
        <div>
          <p className="font-medium">SendGrid</p>
          <p className="text-sm text-muted-foreground">
            Email provider integration
          </p>
        </div>
      </div>
    </CardBox>
  );
};

export default IntegrationsCard;

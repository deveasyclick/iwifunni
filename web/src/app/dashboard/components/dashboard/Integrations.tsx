"use client";

import CardBox from "@/app/components/shared/CardBox";
import { Icon } from "@iconify/react";

const integrations = [
  {
    id: 1,
    name: "Segment",
    icon: "logos:segment-icon",
  },
  {
    id: 2,
    name: "Mailgun",
    icon: "logos:mailgun-icon",
  },
  {
    id: 3,
    name: "Twilio",
    icon: "logos:twilio-icon",
  },
  {
    id: 4,
    name: "Firebase",
    icon: "logos:firebase-icon",
  },
  {
    id: 5,
    name: "Slack",
    icon: "logos:slack-icon",
  },
  {
    id: 6,
    name: "Discord",
    icon: "logos:discord-icon",
  },
];

const IntegrationsCard = () => {
  return (
    <CardBox className="p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h5 className="card-title">Integrations</h5>
        <button className="text-sm text-primary hover:underline flex items-center gap-1">
          Manage
          <Icon icon="mdi:chevron-right" className="w-4 h-4" />
        </button>
      </div>

      {/* Icons Row */}
      <div className="flex items-center gap-4">
        {integrations.map((item) => (
          <div
            key={item.id}
            className="w-12 h-12 flex items-center justify-center rounded-xl border border-border bg-muted/30 hover:bg-muted  cursor-pointer hover:scale-105 transition-all ease-in-out"
          >
            <Icon icon={item.icon} className="w-6 h-6" />
          </div>
        ))}
      </div>
    </CardBox>
  );
};

export default IntegrationsCard;

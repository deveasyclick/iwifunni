import React from "react";

import { SubscriberType } from "@/app/types/subscriber";

interface SubscriberFilterProps {
  subscribers: SubscriberType[];
  setFilter: (filter: string) => void;
}

const SubscriberFilter: React.FC<SubscriberFilterProps> = ({
  subscribers,
  setFilter,
}) => {
  const subscribedC = subscribers.filter(
    (s) => s.status.email === "subscribed",
  ).length;
  const unsubscribedC = subscribers.filter(
    (s) => s.status.email === "unsubscribed",
  ).length;
  const bouncedC = subscribers.filter(
    (s) => s.status.email === "bounced",
  ).length;

  return (
    <div className="grid grid-cols-12 gap-6">
      <div
        className="lg:col-span-3 md:col-span-6 col-span-12 p-30 bg-lightprimary text-center rounded-md cursor-pointer"
        onClick={() => setFilter("total_subscribers")}
      >
        <h3 className="text-primary text-2xl">{subscribers.length}</h3>
        <h6 className="text-base text-primary">Total Subscribers</h6>
      </div>

      <div
        className="lg:col-span-3 md:col-span-6 col-span-12 p-30 bg-lightsuccess text-center rounded-md cursor-pointer"
        onClick={() => setFilter("subscribed")}
      >
        <h3 className="text-success text-2xl">{subscribedC}</h3>
        <h6 className="text-base text-success">Subscribed</h6>
      </div>

      <div
        className="lg:col-span-3 md:col-span-6 col-span-12 p-30 bg-lightwarning text-center rounded-md cursor-pointer"
        onClick={() => setFilter("unsubscribed")}
      >
        <h3 className="text-warning text-2xl">{unsubscribedC}</h3>
        <h6 className="text-base text-warning">Unsubscribed</h6>
      </div>

      <div
        className="lg:col-span-3 md:col-span-6 col-span-12 p-30 bg-lighterror text-center rounded-md cursor-pointer"
        onClick={() => setFilter("bounced")}
      >
        <h3 className="text-error text-2xl">{bouncedC}</h3>
        <h6 className="text-base text-error">Bounced</h6>
      </div>
    </div>
  );
};

export default SubscriberFilter;

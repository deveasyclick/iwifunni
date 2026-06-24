import React from 'react';

import type { NotificationType } from '@/app/types/notification';

interface NotificationFilterProps {
  readonly notifications: NotificationType[];
  readonly setFilter: (filter: string) => void;
}

const NotificationFilter: React.FC<NotificationFilterProps> = ({
  notifications,
  setFilter,
}) => {
  const productionNotifications = notifications.filter((n) => !n.is_test);
  const sentC = productionNotifications.filter(
    (n) => n.status === 'sent',
  ).length;
  const pendingC = productionNotifications.filter(
    (n) => n.status === 'pending',
  ).length;
  const failedC = productionNotifications.filter(
    (n) => n.status === 'failed',
  ).length;
  const partialFailedC = productionNotifications.filter(
    (n) => n.status === 'partial_failed',
  ).length;

  return (
    <div className="grid grid-cols-12 gap-6">
      <button
        type="button"
        className="lg:col-span-3 md:col-span-6 col-span-12 p-30 bg-lightprimary text-center rounded-md"
        onClick={() => setFilter('total_notifications')}
      >
        <h3 className="text-primary text-2xl">
          {productionNotifications.length}
        </h3>
        <h6 className="text-base text-primary">Total Notifications</h6>
      </button>

      <button
        type="button"
        className="lg:col-span-3 md:col-span-6 col-span-12 p-30 bg-lightsuccess text-center rounded-md"
        onClick={() => setFilter('sent')}
      >
        <h3 className="text-success text-2xl">{sentC}</h3>
        <h6 className="text-base text-success">Sent</h6>
      </button>

      <button
        type="button"
        className="lg:col-span-3 md:col-span-6 col-span-12 p-30 bg-lightwarning text-center rounded-md"
        onClick={() => setFilter('pending')}
      >
        <h3 className="text-warning text-2xl">{pendingC}</h3>
        <h6 className="text-base text-warning">Pending</h6>
      </button>

      <button
        type="button"
        className="lg:col-span-3 md:col-span-6 col-span-12 p-30 bg-lighterror text-center rounded-md"
        onClick={() => setFilter('failed')}
      >
        <h3 className="text-error text-2xl">{failedC}</h3>
        <h6 className="text-base text-error">Failed</h6>
      </button>

      <button
        type="button"
        className="lg:col-span-3 md:col-span-6 col-span-12 p-30 bg-lightsecondary text-center rounded-md"
        onClick={() => setFilter('partial_failed')}
      >
        <h3 className="text-secondary text-2xl">{partialFailedC}</h3>
        <h6 className="text-base text-secondary">Partial Failed</h6>
      </button>
    </div>
  );
};

export default NotificationFilter;

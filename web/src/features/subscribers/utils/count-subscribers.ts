import type { SubscriberType } from '@/app/types/subscriber';

export interface SubscriberCounts {
  total: number;
  subscribed: number;
  unsubscribed: number;
  bounced: number;
}

export function countSubscribers(
  subscribers: SubscriberType[],
): SubscriberCounts {
  let subscribed = 0;
  let unsubscribed = 0;
  let bounced = 0;

  for (const subscriber of subscribers) {
    if (subscriber.deleted) continue;

    const statuses = Object.values(subscriber.status) as string[];
    if (statuses.includes('subscribed')) {
      subscribed++;
    }
    if (statuses.includes('unsubscribed')) {
      unsubscribed++;
    }
    if (statuses.includes('bounced')) {
      bounced++;
    }
  }

  return {
    total: subscribers.filter((s) => !s.deleted).length,
    subscribed,
    unsubscribed,
    bounced,
  };
}

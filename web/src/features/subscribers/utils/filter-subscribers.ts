import type { SubscriberType } from '@/app/types/subscriber';

export function filterSubscribers(
  subscribers: SubscriberType[],
  filter: string,
  search: string,
): SubscriberType[] {
  const lowerSearch = search.toLowerCase();

  return subscribers.filter((subscriber) => {
    if (subscriber.deleted) return false;

    if (filter !== 'total_subscribers') {
      const channels = Object.keys(subscriber.status) as Array<
        keyof typeof subscriber.status
      >;
      const matchesFilter = channels.some(
        (ch) => subscriber.status[ch] === filter,
      );
      if (!matchesFilter) return false;
    }

    if (!lowerSearch) return true;

    return (
      subscriber.email?.toLowerCase().includes(lowerSearch) ||
      subscriber.phone?.toLowerCase().includes(lowerSearch) ||
      subscriber.pushToken?.toLowerCase().includes(lowerSearch) ||
      subscriber.id.toLowerCase().includes(lowerSearch) ||
      subscriber.name.toLowerCase().includes(lowerSearch)
    );
  });
}

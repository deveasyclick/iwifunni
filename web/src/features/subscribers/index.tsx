'use client';
import React, { useEffect, useState } from 'react';
import CardBox from '@/components/card/CardBox';
import SubscriberFilter from './SubscriberFilter';
import SubscriberListing from './SubscriberListing';
import type { SubscriberType } from '@/app/types/subscriber';

const MOCK_SUBSCRIBERS: SubscriberType[] = [
  {
    id: 'sub_1001',
    name: 'Ada Nwosu',
    email: 'ada@acme.dev',
    phone: '+2348011110001',
    channels: ['email', 'sms'],
    status: { email: 'subscribed', sms: 'subscribed' },
    tags: ['product-updates', 'vip'],
    subscriptionDate: new Date('2026-04-10T09:00:00Z'),
    lastNotificationDate: new Date('2026-05-09T15:35:00Z'),
    deleted: false,
  },
  {
    id: 'sub_1002',
    name: 'Tunde Bello',
    email: 'tunde@globex.io',
    pushToken: 'ExponentPushToken[xxxxxxxxxxxxxx2]',
    channels: ['email', 'push'],
    status: { email: 'unsubscribed', push: 'subscribed' },
    tags: ['digest'],
    subscriptionDate: new Date('2026-03-28T11:20:00Z'),
    lastNotificationDate: new Date('2026-05-07T08:10:00Z'),
    deleted: false,
  },
  {
    id: 'sub_1003',
    name: 'Mina Okafor',
    phone: '+2348099990003',
    channels: ['sms'],
    status: { sms: 'bounced' },
    tags: ['billing-alerts'],
    subscriptionDate: new Date('2026-02-15T07:30:00Z'),
    deleted: false,
  },
];

const SubscriberList = () => {
  const [subscribers, setSubscribers] =
    useState<SubscriberType[]>(MOCK_SUBSCRIBERS);
  const [filter, setFilter] = useState<string>('total_subscribers');
  const [subscriberSearch, setSubscriberSearch] = useState<string>('');

  useEffect(() => {
    const fetchSubscribers = async () => {
      try {
        const res = await fetch('/api/subscriber', {
          headers: {
            browserrefreshed: 'false',
          },
        });
        const json = (await res.json()) as { data?: SubscriberType[] };
        const apiSubscribers = Array.isArray(json.data) ? json.data : [];
        setSubscribers(
          apiSubscribers.length > 0 ? apiSubscribers : MOCK_SUBSCRIBERS,
        );
      } catch (err) {
        console.error('Error fetching subscribers:', err);
        setSubscribers(MOCK_SUBSCRIBERS);
      }
    };
    void fetchSubscribers();
  }, []);

  const deleteSubscriber = async (id: string) => {
    try {
      await fetch('/api/subscriber', {
        method: 'DELETE',
        body: JSON.stringify({ id }),
      });
      setSubscribers((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error('Error deleting subscriber:', err);
      setSubscribers((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const addSubscriber = (newSubscriber: SubscriberType) => {
    setSubscribers((prev) => [newSubscriber, ...prev]);
  };

  const searchSubscribers = (text: string) => {
    setSubscriberSearch(text);
  };

  return (
    <CardBox>
      <SubscriberFilter subscribers={subscribers} setFilter={setFilter} />
      <SubscriberListing
        subscribers={subscribers}
        filter={filter}
        subscriberSearch={subscriberSearch}
        deleteSubscriber={(id: string) => {
          void deleteSubscriber(id);
        }}
        searchSubscribers={searchSubscribers}
        addSubscriber={addSubscriber}
      />
    </CardBox>
  );
};

export default SubscriberList;

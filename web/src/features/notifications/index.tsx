'use client';
import React, { useState } from 'react';
import CardBox from '@/components/card/CardBox';
import NotificationFilter from './NotificationFilter';
import NotificationListing from './NotificationListing';
import { useNotificationList } from './queries';

const NotificationList = () => {
  const { data: notifications = [] } = useNotificationList();
  const [filter, setFilter] = useState<string>('total_notifications');
  const [notificationSearch, setNotificationSearch] = useState<string>('');

  const searchNotifications = (text: string) => {
    setNotificationSearch(text);
  };

  return (
    <CardBox>
      <NotificationFilter notifications={notifications} setFilter={setFilter} />
      <NotificationListing
        notifications={notifications}
        filter={filter}
        notificationSearch={notificationSearch}
        searchNotifications={searchNotifications}
      />
    </CardBox>
  );
};

export default NotificationList;

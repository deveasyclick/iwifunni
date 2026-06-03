import type { Metadata } from 'next';
import BreadcrumbComp from '../layout/shared/breadcrumb/BreadcrumbComp';
import NotificationList from '../components/notifications';

export const metadata: Metadata = {
  title: 'Notifications',
};

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Notifications',
  },
];

const Notifications = () => {
  return (
    <>
      <BreadcrumbComp title="Notifications" items={BCrumb} />
      <NotificationList />
    </>
  );
};

export default Notifications;

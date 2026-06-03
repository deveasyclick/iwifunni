import type { Metadata } from 'next';
import BreadcrumbComp from '../layout/shared/breadcrumb/BreadcrumbComp';
import SubscriberList from '../components/subscribers';

export const metadata: Metadata = {
  title: 'Subscribers',
};

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Subscribers',
  },
];

const Subscribers = () => {
  return (
    <>
      <BreadcrumbComp title="Subscribers" items={BCrumb} />
      <SubscriberList />
    </>
  );
};

export default Subscribers;

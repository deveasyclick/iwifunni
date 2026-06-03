import type { Metadata } from 'next';
import BreadcrumbComp from '../../layout/shared/breadcrumb/BreadcrumbComp';
import ApiKeyManagement from '../../components/settings/apikey';

export const metadata: Metadata = {
  title: 'Settings - API Keys',
};

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    to: '/dashboard/settings',
    title: 'Settings',
  },
  {
    title: 'API Keys',
  },
];

const ApiKeysPage = () => {
  return (
    <>
      <BreadcrumbComp title="API Keys" items={BCrumb} />
      <ApiKeyManagement />
    </>
  );
};

export default ApiKeysPage;

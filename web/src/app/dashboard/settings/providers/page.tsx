import type { Metadata } from 'next';
import BreadcrumbComp from '../../layout/shared/breadcrumb/BreadcrumbComp';
import ProviderManagement from '../../../../features/settings/providers';

export const metadata: Metadata = {
  title: 'Settings - Providers',
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
    title: 'Providers',
  },
];

const ProvidersSettingsPage = () => {
  return (
    <>
      <BreadcrumbComp title="Providers" items={BCrumb} />
      <ProviderManagement />
    </>
  );
};

export default ProvidersSettingsPage;

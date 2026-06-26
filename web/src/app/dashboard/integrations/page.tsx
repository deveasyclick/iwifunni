import type { Metadata } from 'next';
import IntegrationManagement from '@/features/integrations/IntegrationManagement';
import BreadcrumbComp from '../layout/shared/breadcrumb/BreadcrumbComp';

export const metadata: Metadata = {
  title: 'Integrations',
};

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Integrations',
  },
];

const IntegrationsPage = () => {
  return (
    <>
      <BreadcrumbComp title="Integrations" items={BCrumb} />
      <IntegrationManagement />
    </>
  );
};

export default IntegrationsPage;

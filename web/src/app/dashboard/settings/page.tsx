import Link from 'next/link';
import type { Metadata } from 'next';
import BreadcrumbComp from '../layout/shared/breadcrumb/BreadcrumbComp';
import CardBox from '@/components/card/CardBox';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Settings',
};

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Settings',
  },
];

const SettingsPage = () => {
  return (
    <>
      <BreadcrumbComp title="Settings" items={BCrumb} />
      <CardBox className="p-6">
        <h5 className="card-title mb-1">Project Settings</h5>
        <p className="text-sm text-muted-foreground mb-6">
          Manage project-level credentials and integration endpoints.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <CardBox className="p-4">
            <h6 className="text-base font-semibold mb-1">API Keys</h6>
            <p className="text-sm text-muted-foreground mb-4">
              Create, rotate, and revoke machine authentication keys.
            </p>
            <Button asChild>
              <Link href="/dashboard/settings/apikey">Manage API Keys</Link>
            </Button>
          </CardBox>

        </div>
      </CardBox>
    </>
  );
};

export default SettingsPage;

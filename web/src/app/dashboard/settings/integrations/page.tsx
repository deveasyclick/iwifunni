import { redirect } from 'next/navigation';

const IntegrationsSettingsPage = () => {
  redirect('/dashboard/settings/providers');
};

export default IntegrationsSettingsPage;

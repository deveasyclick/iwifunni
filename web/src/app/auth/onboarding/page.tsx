import { Onboarding } from '@/app/components/auth/Onboarding';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const page = async () => {
  const cookieStore = await cookies();
  if (!cookieStore.get('access_token')?.value) {
    redirect('/auth/login');
  }
  if (cookieStore.get('needs_onboarding')?.value !== 'true') {
    redirect('/dashboard');
  }

  return <Onboarding />;
};

export default page;

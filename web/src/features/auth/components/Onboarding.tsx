'use client';

import CardBox from '../../../components/card/CardBox';
import { FormEvent, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import FullLogo from '../../../components/shared/FullLogo';
import { useRouter } from 'next/navigation';
import { useCompleteOnboarding } from '@/features/auth/queries';

export const Onboarding = () => {
  const router = useRouter();
  const [organizationName, setOrganizationName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const onboarding = useCompleteOnboarding();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      await onboarding.mutateAsync({ organization_name: organizationName });
      router.replace('/dashboard');
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to complete onboarding.',
      );
    }
  }

  return (
    <div className="h-screen w-full flex justify-center items-center bg-lightprimary">
      <div className="md:min-w-112.5 min-w-max">
        <CardBox>
          <div className="flex justify-center mb-4">
            <FullLogo />
          </div>
          <p className="text-sm text-muted-foreground text-center mb-6">
            Name your organization to finish setting up your workspace.
          </p>
          <form
            onSubmit={(e) => {
              void handleSubmit(e);
            }}
          >
            <div>
              <div className="mb-2 block">
                <Label htmlFor="organizationName" className="font-medium">
                  Organization name
                </Label>
              </div>
              <Input
                id="organizationName"
                type="text"
                placeholder="Acme"
                value={organizationName}
                onChange={(event) => setOrganizationName(event.target.value)}
                required
              />
            </div>
            {error ? (
              <p className="mt-4 text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <Button
              className="w-full mt-6"
              type="submit"
              disabled={onboarding.isPending}
            >
              {onboarding.isPending ? 'Finishing...' : 'Finish Setup'}
            </Button>
          </form>
        </CardBox>
      </div>
    </div>
  );
};

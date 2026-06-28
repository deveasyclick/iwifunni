'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useState } from 'react';
import CardBox from '../../../components/card/CardBox';
import FullLogo from '../../../components/shared/FullLogo';
import { SocialAuthButtons } from './SocialAuthButtons';

export const Login = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(searchParams.get('error'));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        email?: string;
        needs_onboarding?: boolean;
      } | null;

      if (!response.ok) {
        if (response.status === 403 && payload?.email) {
          router.replace(
            `/auth/verify?email=${encodeURIComponent(payload.email)}`,
          );
          return;
        }
        setError(payload?.error || 'Unable to sign in.');
        return;
      }

      router.replace(
        payload?.needs_onboarding ? '/auth/onboarding' : '/dashboard',
      );
      router.refresh();
    } catch {
      setError('Unable to sign in right now.');
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
            Welcome back. Verified accounts continue to your dashboard or
            onboarding.
          </p>
          <SocialAuthButtons />
          <form
            onSubmit={(e) => {
              void handleSubmit(e);
            }}
          >
            <div>
              <div className="mb-2 block">
                <Label htmlFor="email" className="font-medium">
                  Email
                </Label>
              </div>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="mt-6">
              <div className="mb-2 block">
                <Label htmlFor="password" className="font-medium">
                  Password
                </Label>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <div className="flex flex-wrap gap-6 items-center justify-between my-6">
              <div className="flex items-center gap-2">
                <Checkbox id="remember" defaultChecked />
                <Label
                  className="text-link font-normal text-sm"
                  htmlFor="remember"
                >
                  Remember this device
                </Label>
              </div>
              <Link
                href="#"
                className="text-sm font-medium text-primary hover:text-primaryemphasis"
              >
                Forgot Password ?
              </Link>
            </div>
            {error ? (
              <p className="mb-4 text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <Button className="w-full" type="submit">
              Sign In
            </Button>
          </form>
          <div className="flex items center gap-2 justify-center mt-6 flex-wrap">
            <p className="text-base font-medium text-muted-foreground">
              New to Iwifunni?
            </p>
            <Link
              href="/auth/register"
              className="text-sm font-medium text-primary hover:text-primaryemphasis"
            >
              Create an account
            </Link>
          </div>
        </CardBox>
      </div>
    </div>
  );
};

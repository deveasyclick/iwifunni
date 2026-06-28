'use client';

import CardBox from '../../../components/card/CardBox';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import FullLogo from '../../../components/shared/FullLogo';
import { SocialAuthButtons } from './SocialAuthButtons';
import { useRouter, useSearchParams } from 'next/navigation';
import { useVerifyEmail, useResendVerification } from '@/features/auth/queries';

export const VerifyEmail = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const verifyEmail = useVerifyEmail();
  const resendCode = useResendVerification();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      const result = await verifyEmail.mutateAsync({ email, code });

      router.replace(
        result.needs_onboarding ? '/auth/onboarding' : '/dashboard',
      );
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to verify your email.',
      );
    }
  }

  async function handleResend() {
    setError(null);
    setResendMessage(null);

    try {
      await resendCode.mutateAsync({ email });
      setResendMessage('A new code has been sent to your email.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend code.');
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
            Enter the six-digit code sent to your email to continue.
          </p>
          <SocialAuthButtons helperText="Or continue with social sign-in" />
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
                <Label htmlFor="code" className="font-medium">
                  Verification code
                </Label>
              </div>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                }
                required
              />
            </div>
            {error ? (
              <p className="mt-4 text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            {resendMessage ? (
              <p className="mt-4 text-sm text-green-600" role="status">
                {resendMessage}
              </p>
            ) : null}
            <div className="flex gap-2 mt-6">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={resendCode.isPending}
                onClick={() => void handleResend()}
              >
                {resendCode.isPending ? 'Sending...' : 'Resend Code'}
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={verifyEmail.isPending}
              >
                {verifyEmail.isPending ? 'Verifying...' : 'Verify Email'}
              </Button>
            </div>
          </form>
          <div className="flex items center gap-2 justify-center mt-6 flex-wrap">
            <p className="text-base font-medium text-muted-foreground">
              Need a different account?
            </p>
            <Link
              href="/auth/login"
              className="text-sm font-medium text-primary hover:text-primaryemphasis"
            >
              Sign In
            </Link>
          </div>
        </CardBox>
      </div>
    </div>
  );
};

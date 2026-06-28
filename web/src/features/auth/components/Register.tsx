'use client';

import CardBox from '../../../components/card/CardBox';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import FullLogo from '../../../components/shared/FullLogo';
import { SocialAuthButtons } from './SocialAuthButtons';
import { useRouter } from 'next/navigation';
import { useSignup } from '@/features/auth/queries';

export const Register = () => {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const signup = useSignup();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      const result = await signup.mutateAsync({
        first_name: firstName,
        last_name: lastName,
        email,
        password,
      });

      const nextEmail = result.email || email;
      router.replace(`/auth/verify?email=${encodeURIComponent(nextEmail)}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create your account.');
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
            Create your account, then verify your email before accessing the
            dashboard.
          </p>
          <SocialAuthButtons helperText="Or sign up with email" />
          <form
            onSubmit={(e) => {
              void handleSubmit(e);
            }}
          >
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <div className="mb-2 block">
                  <Label htmlFor="firstName" className="font-medium">
                    First name
                  </Label>
                </div>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Ada"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  required
                />
              </div>
              <div>
                <div className="mb-2 block">
                  <Label htmlFor="lastName" className="font-medium">
                    Last name
                  </Label>
                </div>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Lovelace"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  required
                />
              </div>
            </div>
            <div className="mt-6">
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
            {error ? (
              <p className="mt-4 text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <Button
              className="w-full mt-6"
              type="submit"
              disabled={signup.isPending}
            >
              {signup.isPending ? 'Signing Up...' : 'Sign Up'}
            </Button>
          </form>
          <div className="flex items center gap-2 justify-center mt-6 flex-wrap">
            <p className="text-base font-medium text-muted-foreground">
              Already have an account?
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

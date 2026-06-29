'use client';

import CardBox from '@/components/card/CardBox';
import FullLogo from '@/components/shared/FullLogo';
import { useForgotPasswordFlow } from '@/features/auth/hooks/use-forgot-password';
import { ForgotPasswordEmailStep } from './ForgotPasswordEmailStep';
import { ForgotPasswordCodeStep } from './ForgotPasswordCodeStep';
import { ForgotPasswordResetStep } from './ForgotPasswordResetStep';
import Link from 'next/link';

export const ForgotPassword = () => {
  const flow = useForgotPasswordFlow();

  return (
    <div className="min-h-screen w-full flex justify-center items-center bg-lightprimary px-4 py-8">
      <div className="w-full max-w-md">
        <CardBox>
          <div className="flex justify-center mb-4">
            <FullLogo />
          </div>

          {flow.step === 'email' && (
            <ForgotPasswordEmailStep
              isSubmitting={flow.isSendingCode}
              onSubmit={flow.handleSendCode}
            />
          )}

          {flow.step === 'code' && (
            <ForgotPasswordCodeStep
              isSubmitting={flow.isVerifyingCode}
              error={flow.error}
              onSubmit={flow.handleVerifyCode}
              onBack={flow.goBackToEmail}
            />
          )}

          {flow.step === 'password' && (
            <ForgotPasswordResetStep
              isSubmitting={flow.isResettingPassword}
              error={flow.error}
              onSubmit={flow.handleResetPassword}
            />
          )}

          <div className="flex items-center gap-2 justify-center mt-6 flex-wrap">
            <Link
              href="/auth/login"
              className="text-sm font-medium text-primary hover:text-primaryemphasis"
            >
              Back to Sign In
            </Link>
          </div>
        </CardBox>
      </div>
    </div>
  );
};

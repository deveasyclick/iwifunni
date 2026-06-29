'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  useForgotPassword,
  useVerifyResetCode,
  useResetPassword,
} from '@/features/auth/queries';

export type Step = 'email' | 'code' | 'password';

export function useForgotPasswordFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const sendCodeMutation = useForgotPassword();
  const verifyCodeMutation = useVerifyResetCode();
  const resetPasswordMutation = useResetPassword();

  const handleSendCode = async (submittedEmail: string) => {
    setError(null);
    setEmail(submittedEmail);
    try {
      await sendCodeMutation.mutateAsync(submittedEmail);
      setStep('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  };

  const handleVerifyCode = async (submittedCode: string) => {
    setError(null);
    setCode(submittedCode);
    try {
      await verifyCodeMutation.mutateAsync({
        email,
        code: submittedCode,
      });
      setStep('password');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid or expired code.');
    }
  };

  const handleResetPassword = async (newPassword: string) => {
    setError(null);
    try {
      await resetPasswordMutation.mutateAsync({ email, code, newPassword });
      router.replace('/auth/login');
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to reset password.',
      );
    }
  };

  return {
    step,
    error,
    isSendingCode: sendCodeMutation.isPending,
    isVerifyingCode: verifyCodeMutation.isPending,
    isResettingPassword: resetPasswordMutation.isPending,
    handleSendCode,
    handleVerifyCode,
    handleResetPassword,
    goBackToEmail: () => {
      setError(null);
      setStep('email');
    },
  };
}

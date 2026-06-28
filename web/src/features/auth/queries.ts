'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from './api';
import type {
  LoginPayload,
  SignupPayload,
  VerifyEmailPayload,
  OnboardingPayload,
} from './api';

export function useUserProfile() {
  return useQuery({
    queryKey: ['user-profile'],
    queryFn: () => authApi.getUserProfile(),
    staleTime: 60_000,
  });
}

export function useSignin() {
  return useMutation({
    mutationFn: (payload: LoginPayload) => authApi.signin(payload),
  });
}

export function useSignup() {
  return useMutation({
    mutationFn: (payload: SignupPayload) => authApi.signup(payload),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: (payload: VerifyEmailPayload) => authApi.verifyEmail(payload),
  });
}

export function useResendVerification() {
  return useMutation({
    mutationFn: (payload: { email: string }) => authApi.resendVerification(payload),
  });
}

export function useCompleteOnboarding() {
  return useMutation({
    mutationFn: (payload: OnboardingPayload) => authApi.completeOnboarding(payload),
  });
}

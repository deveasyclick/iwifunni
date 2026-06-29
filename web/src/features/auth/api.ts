import { request } from '@/lib/api-client';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignupPayload {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
}

export interface VerifyEmailPayload {
  email: string;
  code: string;
}

export interface OnboardingPayload {
  organization_name: string;
}

export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface AuthResult {
  access_token: string;
  refresh_token: string;
  user_id?: string;
  organization_id?: string;
  environment_id?: string;
  needs_onboarding?: boolean;
}

export interface SignupResult {
  email: string;
  verification_required?: boolean;
}

export interface VerifyResult {
  needs_onboarding?: boolean;
}

export const authApi = {
  getUserProfile() {
    return request<UserProfile>('/api/auth/me', { method: 'GET' });
  },

  signin(payload: LoginPayload) {
    return request<AuthResult>('/api/auth/signin', {
      method: 'POST',
      body: payload,
    });
  },

  signup(payload: SignupPayload) {
    return request<SignupResult>('/api/auth/signup', {
      method: 'POST',
      body: payload,
    });
  },

  logout() {
    return request<void>('/api/auth/logout', { method: 'POST' });
  },

  verifyEmail(payload: VerifyEmailPayload) {
    return request<VerifyResult>('/api/auth/verify-email', {
      method: 'POST',
      body: payload,
    });
  },

  resendVerification(payload: { email: string }) {
    return request<void>('/api/auth/resend-verification', {
      method: 'POST',
      body: payload,
    });
  },

  completeOnboarding(payload: OnboardingPayload) {
    return request<void>('/api/auth/onboarding', {
      method: 'POST',
      body: payload,
    });
  },

  forgotPassword(email: string) {
    return request<{ message: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: { email },
    });
  },

  verifyResetCode(email: string, code: string) {
    return request<{ status: string }>('/api/auth/verify-reset-code', {
      method: 'POST',
      body: { email, code },
    });
  },

  resetPassword(email: string, code: string, newPassword: string) {
    return request<{ message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: { email, code, new_password: newPassword },
    });
  },
};

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Icon } from '@iconify/react';
import { useState } from 'react';
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from '@/features/auth/schema/forgot-password';

type Props = {
  readonly isSubmitting: boolean;
  readonly error: string | null;
  readonly onSubmit: (newPassword: string) => Promise<void>;
};

function PasswordInput({
  value,
  onChange,
  placeholder,
  showPassword,
  onToggle,
}: {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder: string;
  readonly showPassword: boolean;
  readonly onToggle: () => void;
}) {
  return (
    <div className="relative">
      <Input
        type={showPassword ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pr-10"
      />
      <button
        type="button"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        onClick={onToggle}
        tabIndex={-1}
      >
        <Icon
          icon={showPassword ? 'tabler:eye-off' : 'tabler:eye'}
          height={18}
        />
      </button>
    </div>
  );
}

export function ForgotPasswordResetStep({
  isSubmitting,
  error,
  onSubmit,
}: Props) {
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
    mode: 'onChange',
  });

  const handleSubmit = async (values: ResetPasswordFormValues) => {
    if (values.newPassword !== values.confirmPassword) {
      setMatchError('Passwords do not match.');
      return;
    }
    setMatchError(null);
    await onSubmit(values.newPassword);
  };

  const handleConfirmChange = (
    value: string,
    fieldOnChange: (v: string) => void,
  ) => {
    fieldOnChange(value);
    const newPass = form.getValues().newPassword;
    if (newPass && value !== newPass) {
      setMatchError('Passwords do not match.');
    } else {
      setMatchError(null);
    }
  };

  const displayError = matchError || error;

  return (
    <>
      <p className="text-sm text-muted-foreground text-center mb-6">
        Code verified. Choose a new password (at least 8 characters).
      </p>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <FormField
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New password</FormLabel>
                <FormControl>
                  <PasswordInput
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="At least 8 characters"
                    showPassword={showNewPassword}
                    onToggle={() => setShowNewPassword(!showNewPassword)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="confirmPassword"
            render={({ field }) => (
              <FormItem className="mt-6">
                <FormLabel>Confirm new password</FormLabel>
                <FormControl>
                  <PasswordInput
                    value={field.value}
                    onChange={(v) => handleConfirmChange(v, field.onChange)}
                    placeholder="Re-enter your new password"
                    showPassword={showConfirmPassword}
                    onToggle={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {displayError ? (
            <p className="mt-4 text-sm text-destructive" role="alert">
              {displayError}
            </p>
          ) : null}
          <Button className="w-full mt-6" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save New Password'}
          </Button>
        </form>
      </Form>
    </>
  );
}

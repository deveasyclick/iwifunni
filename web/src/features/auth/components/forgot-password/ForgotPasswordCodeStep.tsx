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
import {
  codeSchema,
  type CodeFormValues,
} from '@/features/auth/schema/forgot-password';

type Props = {
  readonly isSubmitting: boolean;
  readonly error: string | null;
  readonly onSubmit: (code: string) => Promise<void>;
  readonly onBack: () => void;
};

export function ForgotPasswordCodeStep({
  isSubmitting,
  error,
  onSubmit,
  onBack,
}: Props) {
  const form = useForm<CodeFormValues>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: '' },
  });

  const handleSubmit = async (values: CodeFormValues) => {
    await onSubmit(values.code);
  };

  return (
    <>
      <p className="text-sm text-muted-foreground text-center mb-6">
        If the email address is valid you will receive a verification code via
        email. Please type it below.
      </p>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <FormField
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Verification code</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="123456"
                    {...field}
                    onChange={(e) => {
                      field.onChange(
                        e.target.value.replace(/\D/g, '').slice(0, 6),
                      );
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {error ? (
            <p className="mt-4 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button className="w-full mt-6" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Verifying...' : 'Verify Code'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full mt-2"
            onClick={onBack}
          >
            Back
          </Button>
        </form>
      </Form>
    </>
  );
}

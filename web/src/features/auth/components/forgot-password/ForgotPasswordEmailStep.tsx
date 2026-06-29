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
  emailSchema,
  type EmailFormValues,
} from '@/features/auth/schema/forgot-password';

type Props = {
  readonly defaultEmail?: string;
  readonly isSubmitting: boolean;
  readonly onSubmit: (email: string) => Promise<void>;
};

export function ForgotPasswordEmailStep({
  defaultEmail = '',
  isSubmitting,
  onSubmit,
}: Props) {
  const form = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: defaultEmail },
  });

  const handleSubmit = async (values: EmailFormValues) => {
    await onSubmit(values.email);
  };

  return (
    <>
      <p className="text-sm text-muted-foreground text-center mb-6">
        Enter your email address and we&apos;ll send you a verification code to
        reset your password.
      </p>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <FormField
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button className="w-full mt-6" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send verification code'}
          </Button>
        </form>
      </Form>
    </>
  );
}

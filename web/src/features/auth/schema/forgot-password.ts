import { z } from 'zod';

export const emailSchema = z.object({
  email: z.string().email('Enter a valid email address'),
});

export const codeSchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits'),
});

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
});

export type EmailFormValues = z.infer<typeof emailSchema>;
export type CodeFormValues = z.infer<typeof codeSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

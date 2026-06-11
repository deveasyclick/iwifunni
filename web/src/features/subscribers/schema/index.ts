import { z } from 'zod';

export const subscriberFormSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters'),
    email: z.preprocess(
      (value) =>
        typeof value === 'string' && value.trim() === '' ? undefined : value,
      z.email('Enter a valid email address').optional(),
    ),
    phone: z.preprocess(
      (value) =>
        typeof value === 'string' && value.trim() === '' ? undefined : value,
      z.string().trim().optional(),
    ),
    pushToken: z.preprocess(
      (value) =>
        typeof value === 'string' && value.trim() === '' ? undefined : value,
      z.string().trim().optional(),
    ),
    channels: z
      .array(z.enum(['email', 'sms', 'push']))
      .min(1, 'Select at least one notification channel'),
    tags: z.array(z.string().trim().min(1)).max(10, 'Maximum of 10 tags'),
  })
  .superRefine((data, ctx) => {
    if (data.channels.includes('email') && !data.email) {
      ctx.addIssue({
        code: 'custom',
        path: ['email'],
        message: 'Email is required when Email channel is selected',
      });
    }
    if (data.channels.includes('sms') && !data.phone) {
      ctx.addIssue({
        code: 'custom',
        path: ['phone'],
        message: 'Phone is required when SMS channel is selected',
      });
    }
    if (data.channels.includes('push') && !data.pushToken) {
      ctx.addIssue({
        code: 'custom',
        path: ['pushToken'],
        message: 'Push token is required when Push channel is selected',
      });
    }
  });

export type SubscriberFormValues = z.infer<typeof subscriberFormSchema>;

import { z } from 'zod';

export const subscriberFormSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email address').optional().or(z.literal('')),
  phone: z.string().trim().optional().or(z.literal('')),
  channels: z
    .array(z.enum(['email', 'sms', 'push']))
    .min(1, 'Select at least one notification channel'),
  metadata: z.string().optional(),
});

export type SubscriberFormValues = z.infer<typeof subscriberFormSchema>;

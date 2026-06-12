import { z } from 'zod';

export const subscriberFormSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email address').optional().or(z.literal('')),
  phone: z.string().trim().regex(/^\+[\d\s\-\(\)]{2,}$/, 'Phone must include a country code (e.g. +1XXXXXXXXX)').optional().or(z.literal('')),
  metadata: z.string().optional(),
});

export type SubscriberFormValues = z.infer<typeof subscriberFormSchema>;

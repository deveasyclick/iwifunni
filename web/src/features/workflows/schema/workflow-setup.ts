import { z } from 'zod';

export const workflowSetupSchema = z.object({
  name: z.string().trim().min(1, 'Workflow name is required'),
  description: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || ''),
});

export type WorkflowSetupValues = z.infer<typeof workflowSetupSchema>;

export const slugifyKey = (name: string): string =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

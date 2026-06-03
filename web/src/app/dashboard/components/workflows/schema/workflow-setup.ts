import { z } from 'zod';

export const workflowSetupSchema = z.object({
  key: z.string().trim().min(1, 'Workflow key is required'),
  name: z.string().trim().min(1, 'Workflow name is required'),
  description: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || ''),
});

export type WorkflowSetupValues = z.infer<typeof workflowSetupSchema>;

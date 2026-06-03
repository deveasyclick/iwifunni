'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import type { CreateWorkflowPayload } from '@/app/types/workflow';
import { workflowApi } from '../api';
import {
  createDefaultWorkflowBuilderDraft,
  workflowDefinitionFromBuilderDraft,
} from '../draft';
import { buildWorkflowBuilderHref } from '../utils/urls';
import { workflowSetupSchema, slugifyKey } from '../schema/workflow-setup';

type SetupFieldErrors = Partial<Record<'name', string>>;

export type WorkflowCreateResult = {
  name: string;
  description: string;
  errors: SetupFieldErrors;
  error: string | null;
  creating: boolean;
  setName: (value: string) => void;
  setDescription: (value: string) => void;
  continueToBuilder: () => Promise<void>;
  reset: () => void;
};

export const useWorkflowCreate = (): WorkflowCreateResult => {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<SetupFieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const reset = useCallback(() => {
    setName('');
    setDescription('');
    setErrors({});
    setError(null);
  }, []);

  const continueToBuilder = useCallback(async () => {
    const parsed = workflowSetupSchema.safeParse({ name, description });
    if (!parsed.success) {
      const nextErrors: SetupFieldErrors = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path[0];
        if (path === 'name' && !nextErrors[path]) {
          nextErrors[path] = issue.message;
        }
      }
      setErrors(nextErrors);
      return;
    }

    setError(null);
    setErrors({});

    const generatedKey = slugifyKey(parsed.data.name);
    const payload: CreateWorkflowPayload = {
      key: generatedKey,
      name: parsed.data.name,
      description: parsed.data.description || undefined,
      definition: workflowDefinitionFromBuilderDraft(
        createDefaultWorkflowBuilderDraft(),
      ),
    };

    setCreating(true);
    try {
      const workflow = await workflowApi.createWorkflow(payload);
      router.push(buildWorkflowBuilderHref({ workflowId: workflow.id }));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create workflow draft',
      );
    } finally {
      setCreating(false);
    }
  }, [name, description, router]);

  return {
    name,
    description,
    errors,
    error,
    creating,
    setName: (value: string) => {
      setName(value);
      setErrors((current) => ({ ...current, name: undefined }));
    },
    setDescription,
    continueToBuilder,
    reset,
  };
};

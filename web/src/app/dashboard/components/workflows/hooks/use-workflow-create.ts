'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { CreateWorkflowPayload } from '@/app/types/workflow';
import { workflowApi } from '../api';
import {
  createDefaultWorkflowBuilderDraft,
  workflowDefinitionFromBuilderDraft,
} from '../draft';
import { buildWorkflowBuilderHref } from '../utils/urls';
import { workflowSetupSchema } from '../schema/workflow-setup';
import { workflowSetupValuesFromSearchParams } from '../utils/search-params';

type SetupFieldErrors = Partial<Record<'key' | 'name', string>>;

export type WorkflowCreateResult = {
  key: string;
  name: string;
  description: string;
  errors: SetupFieldErrors;
  error: string | null;
  creating: boolean;
  setKey: (value: string) => void;
  setName: (value: string) => void;
  setDescription: (value: string) => void;
  continueToBuilder: () => Promise<void>;
  handleOpenChange: (open: boolean) => void;
};

export const useWorkflowCreate = (): WorkflowCreateResult => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<SetupFieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const values = workflowSetupValuesFromSearchParams(searchParams);
    setKey(values.key);
    setName(values.name);
    setDescription(values.description);
  }, [searchParams]);

  const continueToBuilder = useCallback(async () => {
    const parsed = workflowSetupSchema.safeParse({ key, name, description });
    if (!parsed.success) {
      const nextErrors: SetupFieldErrors = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path[0];
        if ((path === 'key' || path === 'name') && !nextErrors[path]) {
          nextErrors[path] = issue.message;
        }
      }
      setErrors(nextErrors);
      return;
    }

    setError(null);
    setErrors({});

    const payload: CreateWorkflowPayload = {
      key: parsed.data.key,
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
  }, [key, name, description, router]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        router.push('/dashboard/workflows');
      }
    },
    [router],
  );

  return {
    key,
    name,
    description,
    errors,
    error,
    creating,
    setKey: (value: string) => {
      setKey(value);
      setErrors((current) => ({ ...current, key: undefined }));
    },
    setName: (value: string) => {
      setName(value);
      setErrors((current) => ({ ...current, name: undefined }));
    },
    setDescription,
    continueToBuilder,
    handleOpenChange,
  };
};

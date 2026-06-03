'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { CreateWorkflowPayload } from '@/app/types/workflow';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { workflowApi } from './api';
import {
  createDefaultWorkflowBuilderDraft,
  workflowDefinitionFromBuilderDraft,
} from './draft';
import {
  buildWorkflowBuilderHref,
  workflowSetupSchema,
  workflowSetupValuesFromSearchParams,
} from './create-workflow-metadata';

type SetupFieldErrors = Partial<Record<'key' | 'name', string>>;

const CreateWorkflow = () => {
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

  const continueToBuilder = async () => {
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
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      router.push('/dashboard/workflows');
    }
  };

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl border border-border/60 bg-card p-0 text-card-foreground shadow-2xl">
        <div className="p-6 sm:p-7">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="text-xl font-semibold text-foreground">
              Workflow Setup
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Name the workflow and define its metadata before moving to the
              canvas and inspector.
            </DialogDescription>
          </DialogHeader>

          {error ? (
            <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div>
              <label
                className="mb-2 block text-sm font-medium"
                htmlFor="workflow-key"
              >
                Key
              </label>
              <Input
                id="workflow-key"
                value={key}
                onChange={(e) => {
                  setKey(e.target.value);
                  setErrors((current) => ({ ...current, key: undefined }));
                }}
                placeholder="user_onboarding"
              />
              {errors.key ? (
                <p className="mt-1 text-xs text-error">{errors.key}</p>
              ) : null}
            </div>
            <div>
              <label
                className="mb-2 block text-sm font-medium"
                htmlFor="workflow-name"
              >
                Name
              </label>
              <Input
                id="workflow-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setErrors((current) => ({ ...current, name: undefined }));
                }}
                placeholder="User Onboarding"
              />
              {errors.name ? (
                <p className="mt-1 text-xs text-error">{errors.name}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-4">
            <label
              className="mb-2 block text-sm font-medium"
              htmlFor="workflow-description"
            >
              Description
            </label>
            <Textarea
              id="workflow-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-24"
              placeholder="Triggered after a new account is created"
            />
          </div>

          <DialogFooter className="mt-6 flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button asChild variant="outline">
              <Link href="/dashboard/workflows">Cancel</Link>
            </Button>
            <Button
              onClick={() => void continueToBuilder()}
              disabled={creating}
              className="bg-primary text-primary-foreground hover:bg-primaryemphasis"
            >
              {creating ? 'Creating draft...' : 'Continue to canvas'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateWorkflow;

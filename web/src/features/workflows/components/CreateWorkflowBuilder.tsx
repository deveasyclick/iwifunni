'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import CardBox from '@/components/card/CardBox';
import type { CreateWorkflowPayload } from '@/app/types/workflow';
import { Button } from '@/components/ui/button';
import { workflowApi } from '@/features/workflows/api';
import {
  builderDraftFromDefinition,
  createDefaultWorkflowBuilderDraft,
  workflowDefinitionFromBuilderDraft,
} from '@/features/workflows/draft';
import { WorkflowDefinitionBuilder } from '@/features/workflows/definition-builder/index';
import { buildWorkflowChannelConfigureHref } from '../utils/urls';
import { validateWorkflowDefinitionDraft } from '../utils';

import type {
  CreateWorkflowBuilderProps,
  WorkflowAutosaveState,
} from '@/features/workflows/types/ui';

const buildSaveSignature = (
  definitionSignature: string,
  workflowName: string,
  workflowDescription: string,
) =>
  JSON.stringify({
    definitionSignature,
    workflowName,
    workflowDescription,
  });

const CreateWorkflowBuilder = ({ workflowId }: CreateWorkflowBuilderProps) => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [workflow, setWorkflow] = useState<Awaited<
    ReturnType<typeof workflowApi.getWorkflow>
  > | null>(null);
  const [autosaveState, setAutosaveState] = useState<WorkflowAutosaveState>({
    status: workflowId ? 'loading' : 'error',
    message: workflowId ? 'Loading draft...' : 'Workflow draft not found',
  });
  const [definitionDraft, setDefinitionDraft] = useState(
    createDefaultWorkflowBuilderDraft,
  );
  const lastSavedSignatureRef = useRef<string | null>(null);

  const definition = useMemo(
    () => workflowDefinitionFromBuilderDraft(definitionDraft),
    [definitionDraft],
  );
  const definitionIssues = useMemo(
    () => validateWorkflowDefinitionDraft(definition),
    [definition],
  );
  const draftSignature = useMemo(
    () => JSON.stringify(definitionDraft),
    [definitionDraft],
  );
  const saveSignature = useMemo(
    () =>
      buildSaveSignature(
        draftSignature,
        workflow?.name || '',
        workflow?.description || '',
      ),
    [draftSignature, workflow?.description, workflow?.name],
  );

  useEffect(() => {
    if (!workflowId) {
      setLoading(false);
      setError('Workflow draft not found');
      setAutosaveState({
        status: 'error',
        message: 'Workflow draft not found',
      });
      return;
    }

    let cancelled = false;

    const loadWorkflow = async () => {
      setLoading(true);
      setError(null);
      setAutosaveState({ status: 'loading', message: 'Loading draft...' });

      try {
        const nextWorkflow = await workflowApi.getWorkflow(workflowId);
        if (cancelled) {
          return;
        }

        const nextDraft = builderDraftFromDefinition(nextWorkflow.definition);
        lastSavedSignatureRef.current = buildSaveSignature(
          JSON.stringify(nextDraft),
          nextWorkflow.name,
          nextWorkflow.description || '',
        );
        setWorkflow(nextWorkflow);
        setDefinitionDraft(nextDraft);
        setAutosaveState({ status: 'saved', message: 'Draft ready' });
      } catch (err) {
        if (cancelled) {
          return;
        }
        setError(
          err instanceof Error ? err.message : 'Failed to load workflow draft',
        );
        setAutosaveState({
          status: 'error',
          message: 'Failed to load workflow draft',
        });
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadWorkflow();

    return () => {
      cancelled = true;
    };
  }, [workflowId]);

  useEffect(() => {
    if (!workflow) {
      return;
    }

    if (saveSignature === lastSavedSignatureRef.current) {
      return;
    }

    setAutosaveState({ status: 'saving', message: 'Saving changes...' });
    const payload: CreateWorkflowPayload = {
      key: workflow.key,
      name: workflow.name,
      description: workflow.description || undefined,
      definition,
    };

    const timeoutId = window.setTimeout(() => {
      void workflowApi
        .updateWorkflow(workflow.id, payload)
        .then((updatedWorkflow) => {
          setWorkflow(updatedWorkflow);
          lastSavedSignatureRef.current = saveSignature;
          setAutosaveState({ status: 'saved', message: 'All changes saved' });
        })
        .catch((err: unknown) => {
          setAutosaveState({
            status: 'error',
            message: err instanceof Error ? err.message : 'Autosave failed',
          });
        });
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [definition, definitionIssues.length, saveSignature, workflow]);

  if (loading) {
    return (
      <CardBox className="p-6">
        <p className="text-sm text-muted-foreground">
          Loading workflow draft...
        </p>
      </CardBox>
    );
  }

  if (!workflow) {
    return (
      <CardBox className="p-6">
        <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error || 'Workflow draft not found'}
        </p>
        <Button asChild variant="outline">
          <Link href="/dashboard/workflows">Back to workflows</Link>
        </Button>
      </CardBox>
    );
  }

  return (
    <CardBox className="p-6">
      {error ? (
        <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <WorkflowDefinitionBuilder
        value={definitionDraft}
        onChange={setDefinitionDraft}
        issues={definitionIssues}
        workflowSetup={{
          workflowId: workflow.id,
          key: workflow.key,
          name: workflow.name,
          description: workflow.description || '',
        }}
        autosaveState={autosaveState}
        onWorkflowSetupChange={(values) =>
          setWorkflow((currentWorkflow) =>
            currentWorkflow
              ? {
                  ...currentWorkflow,
                  name: values.name ?? currentWorkflow.name,
                  description:
                    values.description ?? currentWorkflow.description,
                }
              : currentWorkflow,
          )
        }
        onConfigureNotificationNode={(nodeId: string, channel?: string) =>
          router.push(
            buildWorkflowChannelConfigureHref(workflow.id, nodeId, channel),
          )
        }
      />
    </CardBox>
  );
};

export default CreateWorkflowBuilder;

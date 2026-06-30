'use client';

import type { CreateWorkflowPayload, WorkflowItem } from '@/app/types/workflow';
import { useProviders } from '@/features/integrations/queries';
import { workflowApi } from '@/features/workflows/api';
import {
  builderDraftFromDefinition,
  createDefaultWorkflowBuilderDraft,
  workflowDefinitionFromBuilderDraft,
} from '@/features/workflows/draft';
import { useWorkflowQuery } from '@/features/workflows/queries';
import type {
  WorkflowBuilderDraft,
  WorkflowDefinitionIssue,
} from '@/features/workflows/types/draft';
import type { WorkflowAutosaveState } from '@/features/workflows/types/ui';
import { validateWorkflowDefinitionDraft } from '@/features/workflows/utils';
import { buildSaveSignature } from '@/features/workflows/utils/signature';
import { useEffect, useMemo, useRef, useState } from 'react';

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Failed to load workflow draft';
}

export type UseWorkflowBuilderDraftResult = {
  workflow: WorkflowItem | null;
  definitionDraft: WorkflowBuilderDraft;
  setDefinitionDraft: (draft: WorkflowBuilderDraft) => void;
  autosaveState: WorkflowAutosaveState;
  loading: boolean;
  error: string | null;
  definition: ReturnType<typeof workflowDefinitionFromBuilderDraft>;
  definitionIssues: WorkflowDefinitionIssue[];
  onWorkflowSetupChange: (
    values: Partial<Pick<WorkflowItem, 'name' | 'description'>>,
  ) => void;
};

export const useWorkflowBuilderDraft = (
  workflowId: string,
): UseWorkflowBuilderDraftResult => {
  const [workflow, setWorkflow] = useState<WorkflowItem | null>(null);
  const [definitionDraft, setDefinitionDraft] = useState<WorkflowBuilderDraft>(
    createDefaultWorkflowBuilderDraft,
  );
  const [autosaveState, setAutosaveState] = useState<WorkflowAutosaveState>({
    status: 'loading',
    message: 'Loading draft...',
  });

  const lastSavedSignatureRef = useRef<string | null>(null);
  const initialQuerySyncRef = useRef<string | null>(null);

  const workflowQuery = useWorkflowQuery(workflowId);
  const loading = workflowQuery.isLoading && !workflowQuery.data;
  const error = workflowQuery.error
    ? extractErrorMessage(workflowQuery.error)
    : null;

  // Sync query data into local state on initial load (per workflow ID)
  useEffect(() => {
    if (!workflowQuery.data) return;
    if (initialQuerySyncRef.current === workflowId) return;
    initialQuerySyncRef.current = workflowId;

    const nextDraft = workflowQuery.data.definition
      ? builderDraftFromDefinition(workflowQuery.data.definition)
      : createDefaultWorkflowBuilderDraft();

    lastSavedSignatureRef.current = buildSaveSignature(
      JSON.stringify(nextDraft),
      workflowQuery.data.name,
      workflowQuery.data.description || '',
    );
    setWorkflow(workflowQuery.data);
    setDefinitionDraft(nextDraft);
    setAutosaveState({ status: 'saved', message: 'Draft ready' });
  }, [workflowQuery.data, workflowId]);

  // Reflect query loading/error in autosave state
  useEffect(() => {
    if (workflowQuery.isLoading) {
      setAutosaveState({ status: 'loading', message: 'Loading draft...' });
    } else if (workflowQuery.error) {
      setAutosaveState({
        status: 'error',
        message: 'Failed to load workflow draft',
      });
    }
  }, [workflowQuery.isLoading, workflowQuery.error]);

  const definition = useMemo(
    () => workflowDefinitionFromBuilderDraft(definitionDraft),
    [definitionDraft],
  );

  const providersQuery = useProviders();

  const definitionIssues = useMemo(() => {
    const base = validateWorkflowDefinitionDraft(definition);

    // Provider-aware validation: notification nodes need an active provider
    // for their configured channel.
    if (providersQuery.data) {
      const activeChannels = new Set(
        providersQuery.data.filter((p) => p.is_active).map((p) => p.channel),
      );

      for (let i = 0; i < definitionDraft.nodes.length; i++) {
        const node = definitionDraft.nodes[i];
        if (
          node.type === 'notification' &&
          node.channel &&
          !activeChannels.has(node.channel)
        ) {
          base.push({
            path: `nodes.${i}.channels`,
            message: `No active ${node.channel.toUpperCase()} provider configured. Set one up in Integrations page`,
          });
        }
      }
    }

    return base;
  }, [definition, providersQuery.data, definitionDraft.nodes]);
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

  // Autosave with debounce
  useEffect(() => {
    if (!workflow) return;
    if (saveSignature === lastSavedSignatureRef.current) return;

    setAutosaveState({ status: 'saving', message: 'Saving changes...' });
    const payload: CreateWorkflowPayload = {
      key: workflow.key,
      name: workflow.name,
      description: workflow.description || undefined,
      definition,
    };

    const timeoutId = globalThis.setTimeout(() => {
      workflowApi
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

    return () => globalThis.clearTimeout(timeoutId);
    // definitionIssues.length is included so re-saving is triggered when
    // issues change (e.g. a previously-invalid draft becomes valid)
  }, [definition, definitionIssues.length, saveSignature, workflow]);

  const onWorkflowSetupChange = (
    values: Partial<Pick<WorkflowItem, 'name' | 'description'>>,
  ) => {
    setWorkflow((current) => (current ? { ...current, ...values } : current));
  };

  return {
    workflow,
    definitionDraft,
    setDefinitionDraft,
    autosaveState,
    loading,
    error,
    definition,
    definitionIssues,
    onWorkflowSetupChange,
  };
};

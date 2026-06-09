'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CreateWorkflowPayload, WorkflowItem } from '@/app/types/workflow';
import { workflowApi } from '@/features/workflows/api';
import {
  builderDraftFromDefinition,
  createDefaultWorkflowBuilderDraft,
  workflowDefinitionFromBuilderDraft,
} from '@/features/workflows/draft';
import type {
  WorkflowBuilderDraft,
  WorkflowDefinitionIssue,
} from '@/features/workflows/types/draft';
import type { WorkflowAutosaveState } from '@/features/workflows/types/ui';
import { buildSaveSignature } from '@/features/workflows/utils/signature';
import { validateWorkflowDefinitionDraft } from '@/features/workflows/utils';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workflow, setWorkflow] = useState<WorkflowItem | null>(null);
  const [definitionDraft, setDefinitionDraft] = useState<WorkflowBuilderDraft>(
    createDefaultWorkflowBuilderDraft,
  );
  const [autosaveState, setAutosaveState] = useState<WorkflowAutosaveState>({
    status: 'loading',
    message: 'Loading draft...',
  });

  const lastSavedSignatureRef = useRef<string | null>(null);

  // Fetch workflow on mount
  useEffect(() => {
    let cancelled = false;

    const loadWorkflow = async () => {
      setLoading(true);
      setError(null);
      setAutosaveState({ status: 'loading', message: 'Loading draft...' });

      try {
        const nextWorkflow = await workflowApi.getWorkflow(workflowId);
        if (cancelled) return;

        const nextDraft = nextWorkflow.definition
          ? builderDraftFromDefinition(nextWorkflow.definition)
          : createDefaultWorkflowBuilderDraft();

        lastSavedSignatureRef.current = buildSaveSignature(
          JSON.stringify(nextDraft),
          nextWorkflow.name,
          nextWorkflow.description || '',
        );
        setWorkflow(nextWorkflow);
        setDefinitionDraft(nextDraft);
        setAutosaveState({ status: 'saved', message: 'Draft ready' });
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : 'Failed to load workflow draft',
        );
        setAutosaveState({
          status: 'error',
          message: 'Failed to load workflow draft',
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadWorkflow();
    return () => {
      cancelled = true;
    };
  }, [workflowId]);

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

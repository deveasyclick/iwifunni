'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import CardBox from '@/components/card/CardBox';
import { Button } from '@/components/ui/button';
import { workflowApi } from '@/features/workflows/api';
import { WorkflowDefinitionBuilder } from '@/features/workflows/definition-builder/index';
import { useWorkflowBuilderDraft } from '@/features/workflows/hooks/use-workflow-builder-draft';
import { workflowDefinitionFromBuilderDraft } from '@/features/workflows/definition-builder/index';
import { buildWorkflowChannelConfigureHref } from '@/features/workflows/utils/urls';

import type { CreateWorkflowPayload } from '@/app/types/workflow';
import type { CreateWorkflowBuilderProps } from '@/features/workflows/types/ui';

const CreateWorkflowBuilder = ({ workflowId }: CreateWorkflowBuilderProps) => {
  const router = useRouter();
  const {
    workflow,
    definitionDraft,
    setDefinitionDraft,
    autosaveState,
    loading,
    error,
    definitionIssues,
    onWorkflowSetupChange,
  } = useWorkflowBuilderDraft(workflowId);

  const handleConfigureNotificationNode = useCallback(
    async (nodeId: string, channel?: string) => {
      // Save definition before navigating so the channel page
      // can find the notification node on the server.
      const definition = workflowDefinitionFromBuilderDraft(definitionDraft);
      const payload: CreateWorkflowPayload = {
        key: workflow?.key ?? '',
        name: workflow?.name ?? '',
        description: workflow?.description || undefined,
        definition,
      };
      try {
        await workflowApi.updateWorkflow(workflow?.id ?? '', payload);
      } catch {
        // Navigate anyway — the channel page will show an error
        // if the node still isn't found.
      }
      router.push(
        buildWorkflowChannelConfigureHref(workflow?.id ?? '', nodeId, channel),
      );
    },
    [
      definitionDraft,
      workflow?.id,
      workflow?.key,
      workflow?.name,
      workflow?.description,
      router,
    ],
  );

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

  const workflowSetup = workflow
    ? {
        workflowId: workflow.id,
        key: workflow.key,
        name: workflow.name,
        description: workflow.description || '',
      }
    : undefined;

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
        workflowSetup={workflowSetup}
        autosaveState={autosaveState}
        onWorkflowSetupChange={onWorkflowSetupChange}
        onConfigureNotificationNode={handleConfigureNotificationNode}
      />
    </CardBox>
  );
};

export default CreateWorkflowBuilder;

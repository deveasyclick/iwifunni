'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CardBox from '@/components/card/CardBox';
import { Button } from '@/components/ui/button';
import { WorkflowDefinitionBuilder } from '@/features/workflows/definition-builder/index';
import { useWorkflowBuilderDraft } from '@/features/workflows/hooks/use-workflow-builder-draft';
import { buildWorkflowChannelConfigureHref } from '@/features/workflows/utils/urls';

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

  const workflowSetup = {
    workflowId: workflow.id,
    key: workflow.key,
    name: workflow.name,
    description: workflow.description || '',
  };

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

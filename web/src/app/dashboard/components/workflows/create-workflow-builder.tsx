"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import CardBox from "@/app/components/shared/CardBox";
import type { CreateWorkflowPayload } from "@/app/types/workflow";
import { Button } from "@/components/ui/button";
import { workflowApi } from "@/app/dashboard/components/workflows/api";
import {
  builderDraftFromDefinition,
  createDefaultWorkflowBuilderDraft,
  validateWorkflowDefinitionDraft,
  WorkflowDefinitionBuilder,
  workflowDefinitionFromBuilderDraft,
} from "@/app/dashboard/components/workflows/definition-builder";
import {
  buildWorkflowChannelConfigureHref,
} from "./create-workflow-metadata";

type CreateWorkflowBuilderProps = {
  workflowId: string;
};

type AutosaveState = {
  status: "loading" | "saving" | "saved" | "error" | "invalid";
  message: string;
};

const CreateWorkflowBuilder = ({ workflowId }: CreateWorkflowBuilderProps) => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [workflow, setWorkflow] = useState<Awaited<
    ReturnType<typeof workflowApi.getWorkflow>
  > | null>(null);
  const [autosaveState, setAutosaveState] = useState<AutosaveState>({
    status: workflowId ? "loading" : "error",
    message: workflowId ? "Loading draft..." : "Workflow draft not found",
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

  useEffect(() => {
    if (!workflowId) {
      setLoading(false);
      setError("Workflow draft not found");
      setAutosaveState({
        status: "error",
        message: "Workflow draft not found",
      });
      return;
    }

    let cancelled = false;

    const loadWorkflow = async () => {
      setLoading(true);
      setError(null);
      setAutosaveState({ status: "loading", message: "Loading draft..." });

      try {
        const nextWorkflow = await workflowApi.getWorkflow(workflowId);
        if (cancelled) {
          return;
        }

        const nextDraft = builderDraftFromDefinition(nextWorkflow.definition);
        lastSavedSignatureRef.current = JSON.stringify(nextDraft);
        setWorkflow(nextWorkflow);
        setDefinitionDraft(nextDraft);
        setAutosaveState({ status: "saved", message: "Draft ready" });
      } catch (err) {
        if (cancelled) {
          return;
        }
        setError(
          err instanceof Error ? err.message : "Failed to load workflow draft",
        );
        setAutosaveState({
          status: "error",
          message: "Failed to load workflow draft",
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

    const nextSignature = JSON.stringify(definitionDraft);
    if (nextSignature === lastSavedSignatureRef.current) {
      return;
    }

    if (definitionIssues.length > 0) {
      setAutosaveState({
        status: "invalid",
        message: "Fix definition issues to resume autosave",
      });
      return;
    }

    setAutosaveState({ status: "saving", message: "Saving changes..." });
    const payload: CreateWorkflowPayload = {
      key: workflow.key,
      name: workflow.name,
      description: workflow.description || undefined,
      definition,
    };

    const timeoutId = window.setTimeout(async () => {
      try {
        const updatedWorkflow = await workflowApi.updateWorkflow(workflow.id, payload);
        setWorkflow(updatedWorkflow);
        lastSavedSignatureRef.current = nextSignature;
        setAutosaveState({ status: "saved", message: "All changes saved" });
      } catch (err) {
        setAutosaveState({
          status: "error",
          message:
            err instanceof Error ? err.message : "Autosave failed",
        });
      }
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [definition, definitionDraft, definitionIssues.length, workflow]);

  if (loading) {
    return (
      <CardBox className="p-6">
        <p className="text-sm text-muted-foreground">Loading workflow draft...</p>
      </CardBox>
    );
  }

  if (!workflow) {
    return (
      <CardBox className="p-6">
        <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error || "Workflow draft not found"}
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

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/50 bg-card px-4 py-3">
        <div>
          <p className="text-sm font-medium text-foreground">{workflow.name}</p>
          <p className="text-xs text-muted-foreground">
            {workflow.description || workflow.key}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-full border border-border/60 px-2 py-1 text-muted-foreground">
            {workflow.key}
          </span>
          <span className="rounded-full border border-border/60 px-2 py-1 text-foreground">
            {autosaveState.message}
          </span>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/workflows">Close</Link>
          </Button>
        </div>
      </div>

      <WorkflowDefinitionBuilder
        value={definitionDraft}
        onChange={setDefinitionDraft}
        issues={definitionIssues}
        workflowSetup={{
          workflowId: workflow.id,
          key: workflow.key,
          name: workflow.name,
          description: workflow.description || "",
        }}
        autosaveState={autosaveState}
        onConfigureNotificationNode={(nodeId: string) =>
          router.push(buildWorkflowChannelConfigureHref(workflow.id, nodeId))
        }
      />
    </CardBox>
  );
};

export default CreateWorkflowBuilder;
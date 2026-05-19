"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CardBox from "@/app/components/shared/CardBox";
import { workflowApi } from "@/app/dashboard/components/workflows/api";
import {
  buildWorkflowBuilderHref,
} from "@/app/dashboard/components/workflows/create-workflow-metadata";
import { zeroUUID } from "@/app/dashboard/components/workflows/definition-builder/constants";
import type { CreateTemplatePayload, TemplateItem } from "@/app/types/template";
import type { WorkflowChannel, WorkflowDefinition, WorkflowNode } from "@/app/types/workflow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ConfigureWorkflowChannelProps = {
  workflowId: string;
  nodeId: string;
};

type TemplateUpdatePayload = {
  subject?: string;
  body: string;
};

const channelConfigLabels: Record<
  WorkflowChannel,
  {
    subject: string;
    body: string;
    hint: string;
  }
> = {
  email: {
    subject: "Email subject",
    body: "Email body",
    hint: "Write the outgoing email subject and body used for this node.",
  },
  sms: {
    subject: "SMS label",
    body: "SMS body",
    hint: "Write the SMS content that will be sent when this step runs.",
  },
  push: {
    subject: "Push title",
    body: "Push message",
    hint: "Write the push title and message for this notification step.",
  },
};

const parseError = async (response: Response): Promise<string> => {
  const fallback = "Request failed";

  try {
    const body = (await response.json()) as {
      error?: string;
      message?: string;
    };
    return body.error || body.message || fallback;
  } catch {
    return fallback;
  }
};

const ConfigureWorkflowChannel = ({
  workflowId,
  nodeId,
}: ConfigureWorkflowChannelProps) => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workflow, setWorkflow] = useState<Awaited<
    ReturnType<typeof workflowApi.getWorkflow>
  > | null>(null);
  const [node, setNode] = useState<WorkflowNode | null>(null);
  const [channel, setChannel] = useState<WorkflowChannel>("email");
  const [templateId, setTemplateId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    if (!workflowId || !nodeId) {
      setError("Workflow or channel node was not provided");
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const nextWorkflow = await workflowApi.getWorkflow(workflowId);
        if (cancelled) {
          return;
        }

        const definition = nextWorkflow.definition;
        const nextNode = definition?.nodes.find((item) => item.id === nodeId) || null;
        if (!nextNode || nextNode.type !== "notification") {
          throw new Error("Notification node not found");
        }

        const config = (nextNode.config || {}) as Record<string, unknown>;
        const nextChannel =
          Array.isArray(config.channels) && typeof config.channels[0] === "string"
            ? (config.channels[0] as WorkflowChannel)
            : "email";
        const nextTemplateId =
          typeof config.template_id === "string" ? config.template_id : "";

        setWorkflow(nextWorkflow);
        setNode(nextNode);
        setChannel(nextChannel);
        setTemplateId(nextTemplateId);

        if (nextTemplateId && nextTemplateId !== zeroUUID) {
          const response = await fetch(`/api/templates/${nextTemplateId}`, {
            method: "GET",
            headers: { browserrefreshed: "false" },
            cache: "no-store",
          });

          if (!response.ok) {
            throw new Error(await parseError(response));
          }

          const template = (await response.json()) as TemplateItem;
          if (!cancelled) {
            setSubject(template.subject || "");
            setBody(template.body || "");
          }
        } else {
          setSubject("");
          setBody("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load channel editor",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [nodeId, workflowId]);

  const labels = useMemo(() => channelConfigLabels[channel], [channel]);

  const saveChannelConfiguration = async () => {
    if (!workflow || !node) {
      setError("Workflow draft is not ready");
      return;
    }
    if (!body.trim()) {
      setError(`${labels.body} is required`);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const templatePayload: CreateTemplatePayload = {
        name: `${workflow.name} ${node.id} ${channel}`,
        channel,
        body: body.trim(),
        subject: channel === "sms" ? undefined : subject.trim() || undefined,
      };

      let savedTemplateId = templateId;
      if (templateId && templateId !== zeroUUID) {
        const response = await fetch(`/api/templates/${templateId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            body: templatePayload.body,
            subject: templatePayload.subject,
          } satisfies TemplateUpdatePayload),
        });

        if (!response.ok) {
          throw new Error(await parseError(response));
        }

        const updatedTemplate = (await response.json()) as TemplateItem;
        savedTemplateId = updatedTemplate.id;
      } else {
        const response = await fetch("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(templatePayload),
        });

        if (!response.ok) {
          throw new Error(await parseError(response));
        }

        const createdTemplate = (await response.json()) as TemplateItem;
        savedTemplateId = createdTemplate.id;
      }

      const currentDefinition = workflow.definition as WorkflowDefinition;
      const nextDefinition: WorkflowDefinition = {
        ...currentDefinition,
        nodes: currentDefinition.nodes.map((definitionNode) => {
          if (definitionNode.id !== node.id) {
            return definitionNode;
          }

          return {
            ...definitionNode,
            config: {
              ...(definitionNode.config || {}),
              template_id: savedTemplateId,
              channels: [channel],
            },
          };
        }),
      };

      await workflowApi.updateWorkflow(workflow.id, {
        key: workflow.key,
        name: workflow.name,
        description: workflow.description || undefined,
        definition: nextDefinition,
      });

      router.push(buildWorkflowBuilderHref({ workflowId: workflow.id }));
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save channel configuration",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <CardBox className="p-6">
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading channel editor...</p>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h5 className="card-title">Configure Channel</h5>
              <p className="mt-1 text-sm text-muted-foreground">
                {labels.hint}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button asChild variant="outline">
                <Link href={buildWorkflowBuilderHref({ workflowId })}>Back to builder</Link>
              </Button>
              <Button
                type="button"
                onClick={() => void saveChannelConfiguration()}
                disabled={saving}
                className="bg-primary text-primary-foreground hover:bg-primaryemphasis"
              >
                {saving ? "Saving..." : "Save channel"}
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card px-4 py-3">
            <p className="text-sm font-medium text-foreground">
              {workflow?.name || "Workflow draft"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Node: {node?.id || nodeId} · Channel: {channel}
            </p>
          </div>

          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {channel !== "sms" ? (
            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="channel-subject">
                {labels.subject}
              </label>
              <Input
                id="channel-subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder={channel === "push" ? "Push title" : "Welcome to Iwifunni"}
              />
            </div>
          ) : null}

          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="channel-body">
              {labels.body}
            </label>
            <Textarea
              id="channel-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              className="min-h-64"
              placeholder={channel === "sms" ? "Hi {{.name}}, your update is ready." : "Hello {{.name}}"}
            />
          </div>
        </div>
      )}
    </CardBox>
  );
};

export default ConfigureWorkflowChannel;
"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CardBox from "@/app/components/shared/CardBox";
import { workflowApi } from "@/app/dashboard/components/workflows/api";
import { buildWorkflowBuilderHref } from "@/app/dashboard/components/workflows/create-workflow-metadata";
import { zeroUUID } from "@/app/dashboard/components/workflows/definition-builder/constants";
import type { CreateTemplatePayload, TemplateItem } from "@/app/types/template";
import type {
  WorkflowChannel,
  WorkflowDefinition,
  WorkflowNode,
} from "@/app/types/workflow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { UnlayerEmailEditorHandle } from "./unlayer-email-editor";

const UnlayerEmailEditor = dynamic(() => import("./unlayer-email-editor"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[560px] items-center justify-center rounded-xl border border-border/50 text-sm text-muted-foreground">
      Loading email editor…
    </div>
  ),
});

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

const getNodeName = (node: WorkflowNode | null, fallbackNodeId: string) => {
  const config = (node?.config || {}) as Record<string, unknown>;
  if (typeof config.name === "string" && config.name.trim()) {
    return config.name.trim();
  }

  return node?.id || fallbackNodeId;
};

const ConfigureWorkflowChannel = ({
  workflowId,
  nodeId,
}: ConfigureWorkflowChannelProps) => {
  const router = useRouter();
  const emailEditorRef = useRef<UnlayerEmailEditorHandle>(null);
  const templateIdRef = useRef<string>("");
  const workflowRef = useRef<Awaited<ReturnType<typeof workflowApi.getWorkflow>> | null>(null);
  const nodeRef = useRef<WorkflowNode | null>(null);
  const channelRef = useRef<WorkflowChannel>("email");
  const subjectRef = useRef<string>("");
  const autosaveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [workflow, setWorkflow] = useState<Awaited<
    ReturnType<typeof workflowApi.getWorkflow>
  > | null>(null);
  const [node, setNode] = useState<WorkflowNode | null>(null);
  const [channel, setChannel] = useState<WorkflowChannel>("email");
  const [templateId, setTemplateId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [emailPreviewHtml, setEmailPreviewHtml] = useState("");

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
        const nextNode =
          definition?.nodes.find((item) => item.id === nodeId) || null;
        if (!nextNode || nextNode.type !== "notification") {
          throw new Error("Notification node not found");
        }

        const config = (nextNode.config || {}) as Record<string, unknown>;
        const nextChannel =
          Array.isArray(config.channels) &&
          typeof config.channels[0] === "string"
            ? (config.channels[0] as WorkflowChannel)
            : "email";
        const nextTemplateId =
          typeof config.template_id === "string" ? config.template_id : "";

        setWorkflow(nextWorkflow);
        setNode(nextNode);
        setChannel(nextChannel);
        setTemplateId(nextTemplateId);
        workflowRef.current = nextWorkflow;
        nodeRef.current = nextNode;
        channelRef.current = nextChannel;
        templateIdRef.current = nextTemplateId;

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
            err instanceof Error
              ? err.message
              : "Failed to load channel editor",
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

  // Keep subject ref in sync for autosave
  useEffect(() => {
    subjectRef.current = subject;
  }, [subject]);

  const performAutosave = useCallback(async (encodedBody: string) => {
    const currentWorkflow = workflowRef.current;
    const currentNode = nodeRef.current;
    const currentChannel = channelRef.current;
    const currentSubject = subjectRef.current;
    const currentTemplateId = templateIdRef.current;

    if (!currentWorkflow || !currentNode) return;

    setAutosaveStatus("saving");
    try {
      const templatePayload: CreateTemplatePayload = {
        name: `${currentWorkflow.name} ${getNodeName(currentNode, nodeId)} ${currentChannel}`,
        channel: currentChannel,
        body: encodedBody,
        subject: currentChannel === "sms" ? undefined : currentSubject.trim() || undefined,
      };

      let savedTemplateId = currentTemplateId;
      if (currentTemplateId && currentTemplateId !== zeroUUID) {
        const response = await fetch(`/api/templates/${currentTemplateId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            body: templatePayload.body,
            subject: templatePayload.subject,
          } satisfies TemplateUpdatePayload),
        });
        if (!response.ok) throw new Error(await parseError(response));
        const updated = (await response.json()) as TemplateItem;
        savedTemplateId = updated.id;
      } else {
        const response = await fetch("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(templatePayload),
        });
        if (!response.ok) throw new Error(await parseError(response));
        const created = (await response.json()) as TemplateItem;
        savedTemplateId = created.id;
        setTemplateId(savedTemplateId);
        templateIdRef.current = savedTemplateId;

        const currentDefinition = currentWorkflow.definition as WorkflowDefinition;
        const nextDefinition: WorkflowDefinition = {
          ...currentDefinition,
          nodes: currentDefinition.nodes.map((definitionNode) =>
            definitionNode.id !== currentNode.id
              ? definitionNode
              : {
                  ...definitionNode,
                  config: {
                    ...(definitionNode.config || {}),
                    template_id: savedTemplateId,
                    channels: [currentChannel],
                  },
                },
          ),
        };
        await workflowApi.updateWorkflow(currentWorkflow.id, {
          key: currentWorkflow.key,
          name: currentWorkflow.name,
          description: currentWorkflow.description || undefined,
          definition: nextDefinition,
        });
      }

      setAutosaveStatus("saved");
    } catch {
      setAutosaveStatus("error");
    }
  }, [nodeId]);

  const handleEncodedBodyChange = useCallback((encodedBody: string) => {
    if (autosaveDebounceRef.current) clearTimeout(autosaveDebounceRef.current);
    autosaveDebounceRef.current = setTimeout(() => {
      void performAutosave(encodedBody);
    }, 1500);
  }, [performAutosave]);

  const labels = useMemo(() => channelConfigLabels[channel], [channel]);
  const previewSubject = subject.trim() || labels.subject;
  const previewBody = body.trim() || `Preview your ${channel} content here.`;

  const saveChannelConfiguration = async () => {
    if (!workflow || !node) {
      setError("Workflow draft is not ready");
      return;
    }

    let resolvedBody = body;
    if (channel === "email") {
      if (!emailEditorRef.current) {
        setError("Email editor is not ready");
        return;
      }
      resolvedBody = await emailEditorRef.current.getEncodedBody();
    } else if (!body.trim()) {
      setError(`${labels.body} is required`);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const templatePayload: CreateTemplatePayload = {
        name: `${workflow.name} ${getNodeName(node, nodeId)} ${channel}`,
        channel,
        body: resolvedBody,
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
        err instanceof Error
          ? err.message
          : "Failed to save channel configuration",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <CardBox className="p-6">
      {loading ? (
        <p className="text-sm text-muted-foreground">
          Loading channel editor...
        </p>
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
              {channel === "email" && autosaveStatus !== "idle" && (
                <span className={`text-xs ${autosaveStatus === "saved" ? "text-muted-foreground" : autosaveStatus === "saving" ? "text-muted-foreground" : "text-destructive"}`}>
                  {autosaveStatus === "saving" ? "Autosaving…" : autosaveStatus === "saved" ? "Autosaved" : "Autosave failed"}
                </span>
              )}
              <Button asChild variant="outline">
                <Link href={buildWorkflowBuilderHref({ workflowId })}>
                  Back to builder
                </Link>
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
              Step: {getNodeName(node, nodeId)} · ID: {node?.id || nodeId} ·
              Channel: {channel}
            </p>
          </div>

          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
            <div className="rounded-2xl border border-border/50 bg-card p-5">
              <div className="mb-4">
                <h6 className="font-medium text-foreground">Editor</h6>
                <p className="mt-1 text-sm text-muted-foreground">
                  Update the template content for this workflow step.
                </p>
              </div>

              <div className="space-y-4">
                {channel !== "sms" ? (
                  <div>
                    <label
                      className="mb-2 block text-sm font-medium"
                      htmlFor="channel-subject"
                    >
                      {labels.subject}
                    </label>
                    <Input
                      id="channel-subject"
                      value={subject}
                      onChange={(event) => setSubject(event.target.value)}
                      placeholder={
                        channel === "push"
                          ? "Push title"
                          : "Welcome to Iwifunni"
                      }
                    />
                  </div>
                ) : null}

                <div>
                  <label
                    className="mb-2 block text-sm font-medium"
                    htmlFor="channel-body"
                  >
                    {labels.body}
                  </label>
                  {channel === "email" ? (
                    <UnlayerEmailEditor
                      ref={emailEditorRef}
                      initialValue={body}
                      onHtmlChange={setEmailPreviewHtml}
                      onEncodedBodyChange={handleEncodedBodyChange}
                    />
                  ) : (
                    <Textarea
                      id="channel-body"
                      value={body}
                      onChange={(event) => setBody(event.target.value)}
                      className="min-h-72 font-mono text-sm"
                      placeholder={
                        channel === "sms"
                          ? "Hi {{.name}}, your update is ready."
                          : "Hello {{.name}}"
                      }
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border/50 bg-card p-5">
              <div className="mb-4">
                <h6 className="font-medium text-foreground">Preview</h6>
                <p className="mt-1 text-sm text-muted-foreground">
                  Live preview of the content that will be used for this
                  notification.
                </p>
              </div>

              {channel === "email" ? (
                <div className="rounded-2xl border border-border/50 bg-white text-slate-900 shadow-sm">
                  <div className="border-b border-slate-200 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      Subject
                    </p>
                    <p className="mt-2 text-sm font-semibold">
                      {previewSubject}
                    </p>
                  </div>
                  <div className="px-1 py-1">
                    {emailPreviewHtml ? (
                      <iframe
                        srcDoc={emailPreviewHtml}
                        title="Email preview"
                        className="h-[480px] w-full rounded-b-xl border-0"
                        sandbox="allow-same-origin"
                      />
                    ) : (
                      <p className="px-3 py-4 text-sm text-slate-400">
                        Start editing to see a live preview.
                      </p>
                    )}
                  </div>
                </div>
              ) : null}

              {channel === "sms" ? (
                <div className="rounded-[28px] border border-border/40 bg-dark p-4">
                  <div className="ml-auto max-w-[85%] rounded-3xl bg-primary px-4 py-3 text-sm leading-6 text-primary-foreground shadow-lg whitespace-pre-wrap">
                    {previewBody}
                  </div>
                </div>
              ) : null}

              {channel === "push" ? (
                <div className="rounded-3xl border border-border/40 bg-dark p-4">
                  <div className="rounded-2xl border border-border/50 bg-card px-4 py-3 shadow-lg">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      Iwifunni notification
                    </p>
                    <p className="mt-2 text-sm font-semibold text-foreground">
                      {previewSubject}
                    </p>
                    <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                      {previewBody}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </CardBox>
  );
};

export default ConfigureWorkflowChannel;

"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { delayUnits } from "./constants";
import type {
  WorkflowAutosaveState,
  BuilderNodeDraft,
  WorkflowCanvasEdge,
  WorkflowCanvasNode,
  WorkflowDefinitionIssue,
  WorkflowSetupSummary,
} from "./types";
import {
  buildNodeDescription,
  formatDelayDuration,
  getNodeDisplayName,
  hasConfiguredTemplateId,
  parseDelayDuration,
} from "./utils";

type WorkflowDefinitionInspectorProps = {
  issues: WorkflowDefinitionIssue[];
  selectedNode: WorkflowCanvasNode | null;
  selectedEdge: WorkflowCanvasEdge | null;
  selectedNodeIssues: WorkflowDefinitionIssue[];
  selectedNodeIncoming: number;
  selectedNodeOutgoing: number;
  selectedEdgeSourceLabel: string;
  selectedEdgeTargetLabel: string;
  updateNodeDraft: (
    nodeId: string,
    updater: (draft: BuilderNodeDraft) => BuilderNodeDraft,
  ) => void;
  removeNode: (nodeId: string) => void;
  removeEdge: (edgeId: string) => void;
  workflowSetup?: WorkflowSetupSummary;
  autosaveState?: WorkflowAutosaveState;
  onConfigureNotificationNode?: (nodeId: string, channel?: string) => void;
  onWorkflowSetupChange?: (
    values: Partial<Pick<WorkflowSetupSummary, "name" | "description">>,
  ) => void;
};

export const WorkflowDefinitionInspector = ({
  issues,
  selectedNode,
  selectedEdge,
  selectedNodeIssues,
  selectedNodeIncoming,
  selectedNodeOutgoing,
  selectedEdgeSourceLabel,
  selectedEdgeTargetLabel,
  updateNodeDraft,
  removeNode,
  removeEdge,
  workflowSetup,
  autosaveState,
  onConfigureNotificationNode,
  onWorkflowSetupChange,
}: WorkflowDefinitionInspectorProps) => {
  const [copiedNodeId, setCopiedNodeId] = useState<string | null>(null);
  const selectedNotificationChannel =
    selectedNode?.data.draft.type === "notification"
      ? selectedNode.data.draft.channel || "email"
      : "email";

  const notificationContentHint =
    selectedNotificationChannel === "sms"
      ? "SMS body is rendered from the linked SMS template body at send time."
      : selectedNotificationChannel === "push"
        ? "Push title and message are rendered from the linked push template at send time."
        : "Email subject and body are rendered from the linked email template at send time.";
  const selectedDelayParts =
    selectedNode?.data.draft.type === "delay"
      ? parseDelayDuration(selectedNode.data.draft.duration)
      : { amount: "", unit: "minutes" as const };
  const inspectorTitle = selectedNode
    ? "Configure step"
    : selectedEdge
      ? "Configure transition"
      : "Configure workflow";

  const copyNodeId = async (nodeId: string) => {
    try {
      await navigator.clipboard.writeText(nodeId);
      setCopiedNodeId(nodeId);
      window.setTimeout(() => {
        setCopiedNodeId((current) => (current === nodeId ? null : current));
      }, 1600);
    } catch {
      setCopiedNodeId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-4">
          <h6 className="font-medium">{inspectorTitle}</h6>
          <p className="text-sm text-muted-foreground">
            {selectedNode
              ? "Adjust this step without changing its system ID."
              : selectedEdge
                ? "Review the current linear transition between steps."
                : "Review workflow-level details and autosave status."}
          </p>
        </div>

        {selectedNode ? (
          <div className="space-y-5">
            <div className="space-y-1">
              <div>
                <p className="text-sm font-medium">
                  {getNodeDisplayName(selectedNode.data.draft)}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {selectedNode.data.draft.type} node
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                {buildNodeDescription(selectedNode.data.draft)}
              </p>
            </div>

            <div className="rounded-xl border border-border p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Status
              </p>
              <div className="mt-2 flex items-center gap-2">
                <Badge
                  variant={
                    selectedNodeIssues.length === 0
                      ? "lightSuccess"
                      : "secondary"
                  }
                >
                  {selectedNodeIssues.length === 0
                    ? "ready"
                    : "needs attention"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {selectedNodeIncoming} in · {selectedNodeOutgoing} out
                </span>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Step name
              </label>
              <Input
                value={selectedNode.data.draft.name}
                onChange={(event) =>
                  updateNodeDraft(selectedNode.id, (draft) => ({
                    ...draft,
                    name: event.target.value,
                  }))
                }
                placeholder="Enter a step name"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Step ID</label>
              <div className="flex items-center gap-2">
                <Input value={selectedNode.data.draft.id} readOnly />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void copyNodeId(selectedNode.data.draft.id)}
                >
                  {copiedNodeId === selectedNode.data.draft.id ? (
                    <Check className="mr-2 h-4 w-4" />
                  ) : (
                    <Copy className="mr-2 h-4 w-4" />
                  )}
                  {copiedNodeId === selectedNode.data.draft.id
                    ? "Copied"
                    : "Copy ID"}
                </Button>
              </div>
            </div>

            {selectedNode.data.draft.type === "delay" && (
              <div className="grid grid-cols-[minmax(0,1fr)_160px] gap-3">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Delay amount
                  </label>
                  <Input
                    value={selectedDelayParts.amount}
                    onChange={(event) =>
                      updateNodeDraft(selectedNode.id, (draft) => ({
                        ...draft,
                        duration: formatDelayDuration(
                          event.target.value,
                          selectedDelayParts.unit,
                        ),
                      }))
                    }
                    inputMode="decimal"
                    placeholder="5"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Unit</label>
                  <Select
                    value={selectedDelayParts.unit}
                    onValueChange={(unit) =>
                      updateNodeDraft(selectedNode.id, (draft) => ({
                        ...draft,
                        duration: formatDelayDuration(
                          selectedDelayParts.amount,
                          unit as typeof selectedDelayParts.unit,
                        ),
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {delayUnits.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {selectedNode.data.draft.type === "notification" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Notification content
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {notificationContentHint}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Delivery type:{" "}
                        {selectedNotificationChannel.toUpperCase()}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {hasConfiguredTemplateId(
                          selectedNode.data.draft.templateId,
                        )
                          ? "This notification step is configured."
                          : `This ${selectedNotificationChannel} step still needs channel content.`}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        onConfigureNotificationNode?.(
                          selectedNode.data.draft.id,
                          selectedNotificationChannel,
                        )
                      }
                    >
                      Configure
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {selectedNode.data.draft.type === "condition" && (
              <div className="rounded-xl border border-warning/20 bg-warning/5 p-3 text-sm text-warningemphasis">
                Condition steps are legacy branching nodes. This linear builder
                does not support editing or publishing them.
              </div>
            )}

            {selectedNodeIssues.length > 0 && (
              <div className="space-y-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-destructive">
                  Node issues
                </p>
                {selectedNodeIssues.map((issue) => (
                  <p
                    key={`${issue.path}-${issue.message}`}
                    className="text-sm text-destructive"
                  >
                    {issue.message}
                  </p>
                ))}
              </div>
            )}
          </div>
        ) : selectedEdge ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium">
                {selectedEdgeSourceLabel || "Source"} →{" "}
                {selectedEdgeTargetLabel || "Target"}
              </p>
              <p className="text-xs text-muted-foreground">Linear transition</p>
            </div>
            <div className="rounded-xl border border-border p-3 text-sm text-muted-foreground">
              This transition is fixed to a single next step. Branch rules are
              not supported in the linear builder.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-border px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {workflowSetup?.name || "Workflow draft"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {workflowSetup?.key || "No workflow key"}
                  </p>
                </div>
                <Badge
                  variant={
                    autosaveState?.status === "saved"
                      ? "lightSuccess"
                      : "secondary"
                  }
                >
                  {autosaveState?.message || "No node selected"}
                </Badge>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Workflow name
                  </label>
                  <Input
                    value={workflowSetup?.name || ""}
                    onChange={(event) =>
                      onWorkflowSetupChange?.({ name: event.target.value })
                    }
                    placeholder="Enter workflow name"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Description
                  </label>
                  <Textarea
                    value={workflowSetup?.description || ""}
                    onChange={(event) =>
                      onWorkflowSetupChange?.({
                        description: event.target.value,
                      })
                    }
                    placeholder="Describe what this workflow does"
                    className="min-h-28"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Workflow key
                    </label>
                    <Input value={workflowSetup?.key || ""} readOnly />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Workflow ID
                    </label>
                    <Input value={workflowSetup?.workflowId || ""} readOnly />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
              Click any node to edit its step settings, or use the canvas edge
              controls to insert the next step.
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h6 className="font-medium">Definition Checks</h6>
          <span className="text-xs text-muted-foreground">
            {issues.length} issue{issues.length === 1 ? "" : "s"}
          </span>
        </div>

        {issues.length === 0 ? (
          <p className="text-sm text-emerald-600">
            The current workflow definition is valid for publish and runtime
            execution.
          </p>
        ) : (
          <div className="space-y-2">
            {issues.map((issue) => (
              <div
                key={`${issue.path}-${issue.message}`}
                className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              >
                <span className="font-medium">{issue.path}</span>:{" "}
                {issue.message}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

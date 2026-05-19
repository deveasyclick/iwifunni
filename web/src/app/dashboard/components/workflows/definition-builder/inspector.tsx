"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { notificationChannels, uuidPattern, zeroUUID } from "./constants";
import type {
  WorkflowAutosaveState,
  BuilderNodeDraft,
  WorkflowCanvasEdge,
  WorkflowCanvasNode,
  WorkflowDefinitionIssue,
  WorkflowSetupSummary,
} from "./types";

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
  onConfigureNotificationNode?: (nodeId: string) => void;
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
}: WorkflowDefinitionInspectorProps) => {
  const selectedNotificationChannel =
    selectedNode?.data.draft.type === "notification"
      ? selectedNode.data.draft.channel || "email"
      : "email";

  const notificationTemplateLabel =
    selectedNotificationChannel === "sms"
      ? "SMS template ID"
      : selectedNotificationChannel === "push"
        ? "Push template ID"
        : "Email template ID";

  const notificationContentHint =
    selectedNotificationChannel === "sms"
      ? "SMS body is rendered from the linked SMS template body at send time."
      : selectedNotificationChannel === "push"
        ? "Push title and message are rendered from the linked push template at send time."
        : "Email subject and body are rendered from the linked email template at send time.";

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-4">
          <h6 className="font-medium">Inspector</h6>
          <p className="text-sm text-muted-foreground">
            Click any node to edit its settings and inspect its status in the current graph.
          </p>
        </div>

        {selectedNode ? (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">
                  {selectedNode.data.draft.id || "Untitled node"}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {selectedNode.data.draft.type} node
                </p>
              </div>
              {selectedNode.data.draft.type !== "trigger" && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeNode(selectedNode.id)}
                >
                  Remove
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Status
                </p>
                <div className="mt-2">
                  <Badge
                    variant={selectedNodeIssues.length === 0 ? "lightSuccess" : "secondary"}
                  >
                    {selectedNodeIssues.length === 0 ? "ready" : "needs attention"}
                  </Badge>
                </div>
              </div>
              <div className="rounded-xl border border-border p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Connections
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {selectedNodeIncoming} in · {selectedNodeOutgoing} out
                </p>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Node ID</label>
              <Input
                value={selectedNode.data.draft.id}
                onChange={(event) =>
                  updateNodeDraft(selectedNode.id, (draft) => ({
                    ...draft,
                    id: event.target.value,
                  }))
                }
                placeholder="node_id"
              />
            </div>

            {selectedNode.data.draft.type === "delay" && (
              <div>
                <label className="mb-2 block text-sm font-medium">Duration</label>
                <Input
                  value={selectedNode.data.draft.duration}
                  onChange={(event) =>
                    updateNodeDraft(selectedNode.id, (draft) => ({
                      ...draft,
                      duration: event.target.value,
                    }))
                  }
                  placeholder="5m"
                />
              </div>
            )}

            {selectedNode.data.draft.type === "notification" && (
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">Channel</label>
                  <Select
                    value={selectedNode.data.draft.channel || "email"}
                    onValueChange={(channel) =>
                      updateNodeDraft(selectedNode.id, (draft) => ({
                        ...draft,
                        channel: channel as BuilderNodeDraft["channel"],
                        templateId:
                          draft.channel === channel ? draft.templateId : zeroUUID,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {notificationChannels.map((channel) => (
                        <SelectItem key={channel} value={channel}>
                          {channel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Channel settings
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {notificationContentHint}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {uuidPattern.test(selectedNode.data.draft.templateId.trim())
                          ? `${notificationTemplateLabel} is configured for this node.`
                          : `This ${selectedNotificationChannel} node still needs channel content.`}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onConfigureNotificationNode?.(selectedNode.id)}
                    >
                      Configure
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {selectedNode.data.draft.type === "condition" && (
              <div className="rounded-xl border border-warning/20 bg-warning/5 p-3 text-sm text-warningemphasis">
                Condition steps are legacy branching nodes. This linear builder does not support editing or publishing them.
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
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">
                  {selectedEdgeSourceLabel || "Source"} → {selectedEdgeTargetLabel || "Target"}
                </p>
                <p className="text-xs text-muted-foreground">Linear transition</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeEdge(selectedEdge.id)}
              >
                Remove
              </Button>
            </div>
            <div className="rounded-xl border border-border p-3 text-sm text-muted-foreground">
              This transition is fixed to a single next step. Branch rules are not supported in the linear builder.
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
                <Badge variant={autosaveState?.status === "saved" ? "lightSuccess" : "secondary"}>
                  {autosaveState?.message || "No node selected"}
                </Badge>
              </div>

              {workflowSetup?.description ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  {workflowSetup.description}
                </p>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  Select a node or edge to edit it. When nothing is focused, the inspector shows workflow setup details and autosave status.
                </p>
              )}
            </div>

            <div className="rounded-xl border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
              Click any node to edit its settings, or use the canvas edge controls to insert the next step.
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
            The current workflow definition is valid for publish and runtime execution.
          </p>
        ) : (
          <div className="space-y-2">
            {issues.map((issue) => (
              <div
                key={`${issue.path}-${issue.message}`}
                className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              >
                <span className="font-medium">{issue.path}</span>: {issue.message}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

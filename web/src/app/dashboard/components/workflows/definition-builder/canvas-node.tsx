"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  BellRing,
  Clock3,
  Copy,
  PencilLine,
  GitBranch,
  Mail,
  MessageSquare,
  Rocket,
  Smartphone,
  Trash2,
} from "lucide-react";
import { memo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  buildNodeDescription,
  buildNodeSubtitle,
  getNodeDisplayName,
  hasConfiguredTemplateId,
} from "./utils";
import type { WorkflowCanvasNode } from "./types";

const handleClassName =
  "h-3! w-3! border-2! border-dark! bg-primary! opacity-0! pointer-events-none shadow-[0_0_0_3px_color-mix(in_oklab,var(--dark)_88%,black)]";

const actionButtonClassName =
  "nodrag nopan inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/55 bg-black/85 text-bodytext transition hover:border-primary/50 hover:text-white";

const getNodeMeta = (node: WorkflowCanvasNode["data"]["draft"]) => {
  switch (node.type) {
    case "trigger":
      return {
        icon: Rocket,
        description: "Starts the workflow run.",
        iconClassName:
          "border border-success/25 bg-lightsuccess/80 text-success",
        label: "Trigger",
        status: "Entry",
        statusClassName: "border-success/20 bg-lightsuccess text-success",
      };
    case "delay":
      return {
        icon: Clock3,
        description: "Pauses before the next step.",
        iconClassName:
          "border border-warning/25 bg-lightwarning/80 text-warning",
        label: "Delay",
        status: "Wait",
        statusClassName: "border-warning/20 bg-lightwarning text-warning",
      };
    case "condition":
      return {
        icon: GitBranch,
        description: "Legacy branching step.",
        iconClassName: "border border-info/25 bg-lightinfo/80 text-info",
        label: "Condition",
        status: "Unsupported",
        statusClassName: "border-info/20 bg-lightinfo text-info",
      };
    case "notification": {
      const channelIcon =
        node.channel === "sms"
          ? MessageSquare
          : node.channel === "push"
            ? Smartphone
            : Mail;

      return {
        icon: channelIcon,
        description: "Sends a configured channel message.",
        iconClassName:
          node.channel === "sms"
            ? "border border-success/25 bg-lightsuccess/80 text-success"
            : node.channel === "push"
              ? "border border-warning/25 bg-lightwarning/80 text-warning"
              : "border border-primary/25 bg-lightprimary/80 text-primary",
        label: "Notification",
        status: hasConfiguredTemplateId(node.templateId)
          ? "Ready"
          : "Configure",
        statusClassName: hasConfiguredTemplateId(node.templateId)
          ? "border-primary/20 bg-lightprimary text-primary"
          : "border-warning/20 bg-lightwarning text-warning",
      };
    }
    default:
      return {
        icon: BellRing,
        description: "Workflow step",
        iconClassName:
          "border border-primary/25 bg-lightprimary/80 text-primary",
        label: "Step",
        status: "Draft",
        statusClassName: "border-primary/20 bg-lightprimary text-primary",
      };
  }
};

const WorkflowCanvasNodeComponent = memo(
  ({ id, data, selected }: NodeProps<WorkflowCanvasNode>) => {
    const draft = data.draft;
    const triggerEvent = data.triggerEvent || "";
    const meta = getNodeMeta(draft);
    const Icon = meta.icon;
    const canDelete = data.canDelete ?? true;
    const canDuplicate = data.canDuplicate ?? true;

    const handleAction = (
      event: React.MouseEvent<HTMLButtonElement>,
      callback?: (nodeId: string) => void,
      enabled = true,
    ) => {
      event.preventDefault();
      event.stopPropagation();
      if (!enabled) {
        return;
      }
      callback?.(id);
    };

    const actionItems = [
      {
        icon: PencilLine,
        label: "Edit node",
        hoverClassName:
          "hover:border-info/60 hover:bg-lightinfo/15 hover:text-info",
        enabled: true,
        onClick: data.onEditNode,
      },
      {
        icon: Copy,
        label: canDuplicate ? "Duplicate node" : "Trigger cannot be duplicated",
        hoverClassName:
          "hover:border-warning/60 hover:bg-lightwarning/15 hover:text-warning",
        enabled: canDuplicate,
        onClick: data.onDuplicateNode,
      },
      {
        icon: Trash2,
        label: canDelete ? "Delete node" : "Trigger cannot be deleted",
        hoverClassName:
          "hover:border-destructive/60 hover:bg-destructive/15 hover:text-destructive",
        enabled: canDelete,
        onClick: data.onRemoveNode,
      },
    ];

    return (
      <div className="group relative min-w-67.5 pt-4">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex -translate-y-1.5 justify-center opacity-0 transition duration-200 group-hover:pointer-events-auto group-hover:opacity-100">
          <div className="flex items-center gap-1 rounded-full border border-border/55 bg-dark/95 px-2 py-1 shadow-[0_16px_30px_rgba(0,0,0,0.35)] backdrop-blur">
            {actionItems.map((action) => {
              const ActionIcon = action.icon;

              return (
                <Tooltip key={action.label}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        actionButtonClassName,
                        action.hoverClassName,
                        action.enabled
                          ? ""
                          : "cursor-not-allowed opacity-45 hover:text-bodytext",
                      )}
                      aria-label={action.label}
                      onClick={(event) =>
                        handleAction(event, action.onClick, action.enabled)
                      }
                    >
                      <ActionIcon className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" sideOffset={6}>
                    {action.label}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>

        <div
          className={cn(
            "relative overflow-hidden rounded-2xl border bg-dark px-4 py-3.5 text-white transition-all duration-200",
            selected
              ? "border-primary ring-1 ring-primary shadow-[0_0_35px_color-mix(in_oklab,var(--primary)_30%,transparent)]"
              : "border-border/45 shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--border)_55%,transparent)] hover:border-primary/40",
          )}
        >
          <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/80 to-transparent" />

          {draft.type !== "trigger" && (
            <Handle
              type="target"
              position={Position.Top}
              isConnectable={false}
              className={handleClassName}
            />
          )}

          <div className="flex items-start gap-2.5">
            <div className={cn("rounded-lg p-1.5", meta.iconClassName)}>
              <Icon className="h-3 w-3" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-white">
                  {getNodeDisplayName(draft)}
                </p>

                {meta.status ? (
                  <div
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                      meta.statusClassName,
                    )}
                  >
                    <div className="h-1.5 w-1.5 rounded-full bg-current" />
                    {meta.status}
                  </div>
                ) : null}
              </div>

              <p className="mt-1 text-[11px] leading-relaxed text-bodytext/85">
                {meta.description || buildNodeDescription(draft)}
              </p>

              <p className="mt-1 text-xs leading-relaxed text-bodytext">
                {buildNodeSubtitle(draft, triggerEvent)}
              </p>
            </div>
          </div>

          <Handle
            id="default"
            type="source"
            position={Position.Bottom}
            isConnectable={false}
            className={handleClassName}
          />
        </div>
      </div>
    );
  },
);

WorkflowCanvasNodeComponent.displayName = "WorkflowCanvasNodeComponent";

export const nodeTypes = { "workflow-step": WorkflowCanvasNodeComponent };

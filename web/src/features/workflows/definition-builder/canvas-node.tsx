'use client';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { AlertCircle, Copy, PencilLine, Trash2 } from 'lucide-react';
import { memo } from 'react';
import type { WorkflowCanvasNode } from '../types/canvas';
import { getNodeMeta } from '../utils';
import {
  buildNodeDescription,
  buildNodeSubtitle,
  getNodeDisplayName,
} from '../utils/display';

const handleClassName =
  'h-3! w-3! border-2! border-card! bg-primary! opacity-0! pointer-events-none shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-card)_88%,black)]';

const actionButtonClassName =
  'nodrag nopan inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/55 bg-background/80 text-muted-foreground transition hover:border-primary/50 hover:text-foreground';

const WorkflowCanvasNodeComponent = memo(
  ({ id, data, selected }: NodeProps<WorkflowCanvasNode>) => {
    const draft = data.draft;
    const triggerEvent = data.triggerEvent || '';
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
        label: 'Edit node',
        hoverClassName:
          'hover:border-info/60 hover:bg-lightinfo/15 hover:text-info',
        enabled: true,
        onClick: data.onEditNode,
      },
      {
        icon: Copy,
        label: canDuplicate ? 'Duplicate node' : 'Trigger cannot be duplicated',
        hoverClassName:
          'hover:border-warning/60 hover:bg-lightwarning/15 hover:text-warning',
        enabled: canDuplicate,
        onClick: data.onDuplicateNode,
      },
      {
        icon: Trash2,
        label: canDelete ? 'Delete node' : 'Trigger cannot be deleted',
        hoverClassName:
          'hover:border-destructive/60 hover:bg-destructive/15 hover:text-destructive',
        enabled: canDelete,
        onClick: data.onRemoveNode,
      },
    ];

    return (
      <div className="relative min-w-67.5 pt-4">
        {data.nodeIssues && data.nodeIssues.length > 0 && (
          <div className="absolute -right-2 top-3 z-30 pointer-events-auto">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="nodrag nopan inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-destructive bg-destructive/15 text-destructive transition hover:bg-destructive/25"
                  aria-label={`${data.nodeIssues.length} issue${data.nodeIssues.length !== 1 ? 's' : ''}`}
                >
                  <AlertCircle className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                sideOffset={12}
                className="max-w-xs bg-popover text-popover-foreground border border-border"
              >
                <div className="space-y-2">
                  {data.nodeIssues.map((issue, idx) => (
                    <p
                      key={idx}
                      className="flex items-start gap-1.5 text-xs text-destructive"
                    >
                      <AlertCircle className="mt-px h-3 w-3 shrink-0" />
                      <span>{issue.message}</span>
                    </p>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        <div className="group">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex -translate-y-1.5 justify-center opacity-0 transition duration-200 group-hover:pointer-events-auto group-hover:opacity-100">
            <div className="flex items-center gap-1 rounded-full border border-border/55 bg-card/95 px-2 py-1 shadow-[0_16px_30px_rgba(0,0,0,0.35)] backdrop-blur">
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
                            ? ''
                            : 'cursor-not-allowed opacity-45 hover:text-muted-foreground',
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
              'relative overflow-hidden rounded-2xl border bg-card px-4 py-3.5 text-foreground transition-all duration-200',
              selected &&
                'border-primary ring-1 ring-primary shadow-[0_0_35px_color-mix(in_oklab,var(--primary)_30%,transparent)]',
              !selected &&
                data.nodeIssues &&
                data.nodeIssues.length > 0 &&
                'border-destructive shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--destructive)_12%,transparent)] hover:border-destructive/80',
              !selected &&
                (!data.nodeIssues || data.nodeIssues.length === 0) &&
                'border-border/45 shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--border)_55%,transparent)] hover:border-primary/40',
            )}
          >
            <div
              className={cn(
                'absolute inset-x-0 top-0 h-px',
                data.nodeIssues && data.nodeIssues.length > 0
                  ? 'bg-linear-to-r from-transparent via-destructive/80 to-transparent'
                  : 'bg-linear-to-r from-transparent via-primary/80 to-transparent',
              )}
            />

            <Handle
              type="target"
              position={Position.Top}
              isConnectable={false}
              className={handleClassName}
            />

            <div className="flex items-start gap-2.5">
              <div className={cn('rounded-lg p-1.5', meta.iconClassName)}>
                <Icon className="h-3 w-3" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {getNodeDisplayName(draft)}
                  </p>

                  {meta.status ? (
                    <div
                      className={cn(
                        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium',
                        meta.statusClassName,
                      )}
                    >
                      <div className="h-1.5 w-1.5 rounded-full bg-current" />
                      {meta.status}
                    </div>
                  ) : null}
                </div>

                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground/85">
                  {meta.description || buildNodeDescription(draft)}
                </p>

                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
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
      </div>
    );
  },
);

WorkflowCanvasNodeComponent.displayName = 'WorkflowCanvasNodeComponent';

export const nodeTypes = { 'workflow-step': WorkflowCanvasNodeComponent };

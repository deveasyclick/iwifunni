'use client';

import { memo, useState } from 'react';
import { BaseEdge, type EdgeProps } from '@xyflow/react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkflowStepActionMenu } from './WorkflowStepActionMenu';
import type { WorkflowCanvasEdge } from '../types/canvas';

const WorkflowCanvasEdgeComponent = memo(
  ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition: _sourcePosition,
    targetPosition: _targetPosition,
    data,
    selected,
  }: EdgeProps<WorkflowCanvasEdge>) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const isTerminal = data?.isTerminal ?? false;
    const terminalTargetX = sourceX;
    const terminalTargetY = sourceY + 56;
    const targetXCoord = isTerminal ? terminalTargetX : targetX;
    const targetYCoord = isTerminal ? terminalTargetY : targetY;
    const edgePath = `M${sourceX},${sourceY} L${targetXCoord},${targetYCoord}`;
    const labelX = (sourceX + targetXCoord) / 2;
    const labelY = (sourceY + targetYCoord) / 2;
    const buttonSize = 28;
    const buttonX = labelX - buttonSize / 2;
    const buttonY = labelY - buttonSize / 2;
    return (
      <>
        <BaseEdge
          path={edgePath}
          style={{
            stroke: 'color-mix(in oklab, var(--primary) 22%, transparent)',
            strokeWidth: 6,
            filter: 'blur(6px)',
          }}
        />
        <BaseEdge
          path={edgePath}
          markerEnd="url(#workflow-arrow)"
          style={{
            stroke: selected
              ? 'var(--primary)'
              : 'color-mix(in oklab, var(--muted-foreground) 80%, var(--border))',
            strokeWidth: selected ? 2 : 1.6,
          }}
        />

        {data?.onInsertNode ? (
          <foreignObject
            x={buttonX}
            y={buttonY}
            width={buttonSize}
            height={buttonSize}
          >
            <div className="nodrag nopan flex h-full w-full items-center justify-center">
              <WorkflowStepActionMenu
                open={menuOpen}
                onOpenChange={setMenuOpen}
                side="right"
                sideOffset={18}
                onSelect={(type, options) =>
                  data.onInsertNode?.(id, type, options)
                }
              >
                <button
                  type="button"
                  className={cn(
                    'nodrag nopan flex h-7 w-7 items-center justify-center rounded-full border border-border/20 bg-[color-mix(in_oklab,var(--dark)_92%,black)] text-bodytext shadow-lg transition-colors duration-200 hover:border-primary hover:text-primary',
                    selected && 'border-primary text-primary',
                  )}
                  aria-label="Insert workflow step"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </WorkflowStepActionMenu>
            </div>
          </foreignObject>
        ) : null}
      </>
    );
  },
);

WorkflowCanvasEdgeComponent.displayName = 'WorkflowCanvasEdgeComponent';

export const edgeTypes = { 'workflow-edge': WorkflowCanvasEdgeComponent };

'use client';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { WorkflowSetupPanelProps } from '../../types/ui';

export const WorkflowSetupPanel = ({
  workflowSetup,
  autosaveState,
  onWorkflowSetupChange,
}: WorkflowSetupPanelProps) => (
  <div className="space-y-4">
    <div className="rounded-xl border border-border px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">
            {workflowSetup?.name || 'Workflow draft'}
          </p>
          <p className="text-xs text-muted-foreground">
            {workflowSetup?.key || 'No workflow key'}
          </p>
        </div>
        <Badge
          variant={
            autosaveState?.status === 'saved' ? 'lightSuccess' : 'secondary'
          }
        >
          {autosaveState?.message || 'No node selected'}
        </Badge>
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium">
            Workflow name
          </label>
          <Input
            value={workflowSetup?.name || ''}
            onChange={(event) =>
              onWorkflowSetupChange?.({ name: event.target.value })
            }
            placeholder="Enter workflow name"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Description</label>
          <Textarea
            value={workflowSetup?.description || ''}
            onChange={(event) =>
              onWorkflowSetupChange?.({ description: event.target.value })
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
            <Input value={workflowSetup?.key || ''} readOnly />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">
              Workflow ID
            </label>
            <Input value={workflowSetup?.workflowId || ''} readOnly />
          </div>
        </div>
      </div>
    </div>

    <div className="rounded-xl border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
      Click any node to edit its step settings, or use the canvas edge controls
      to insert the next step.
    </div>
  </div>
);

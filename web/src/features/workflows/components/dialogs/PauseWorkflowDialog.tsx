'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { WorkflowItem } from '@/app/types/workflow';

type PauseWorkflowDialogProps = {
  readonly pausingItem: WorkflowItem | null;
  readonly mutatingID: string | null;
  readonly onConfirm: (item: WorkflowItem) => void;
  readonly onCancel: () => void;
};

export const PauseWorkflowDialog = ({
  pausingItem,
  mutatingID,
  onConfirm,
  onCancel,
}: PauseWorkflowDialogProps) => {
  const isPausing = mutatingID === pausingItem?.id;

  return (
    <Dialog
      open={pausingItem !== null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pause workflow</DialogTitle>
          <DialogDescription>
            Are you sure you want to pause <strong>{pausingItem?.name}</strong>?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/30 dark:bg-amber-950/20 dark:text-amber-300">
          <p className="font-medium">What happens when paused:</p>
          <ul className="list-disc space-y-1 pl-4">
            <li>
              The workflow will no longer be triggered by incoming events.
            </li>
            <li>
              Existing in-progress executions will continue to completion.
            </li>
            <li>
              You can resume the workflow at any time to restore normal
              operation.
            </li>
          </ul>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isPausing}>
            Cancel
          </Button>
          <Button
            variant="default"
            disabled={isPausing}
            onClick={() => {
              if (pausingItem) onConfirm(pausingItem);
            }}
          >
            {isPausing ? 'Pausing...' : 'Pause workflow'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

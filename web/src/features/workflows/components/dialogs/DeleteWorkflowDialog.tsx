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

type DeleteWorkflowDialogProps = {
  deletingItem: WorkflowItem | null;
  mutatingID: string | null;
  onConfirm: (id: string) => void;
  onCancel: () => void;
};

export const DeleteWorkflowDialog = ({
  deletingItem,
  mutatingID,
  onConfirm,
  onCancel,
}: DeleteWorkflowDialogProps) => {
  const isDeleting = mutatingID === deletingItem?.id;

  return (
    <Dialog
      open={deletingItem !== null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete workflow</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete{' '}
            <strong>{deletingItem?.name}</strong>? This will archive the
            workflow and it won&apos;t be executed again.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={isDeleting}
            onClick={() => {
              if (deletingItem) onConfirm(deletingItem.id);
            }}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

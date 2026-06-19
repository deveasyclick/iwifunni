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
import type { SubscriberType } from '@/app/types/subscriber';

type DeleteSubscriberDialogProps = {
  readonly open: boolean;
  readonly deletingItem: SubscriberType | null;
  readonly isDeleting: boolean;
  readonly onConfirm: (id: string) => void;
  readonly onCancel: () => void;
};

export const DeleteSubscriberDialog = ({
  open,
  deletingItem,
  isDeleting,
  onConfirm,
  onCancel,
}: DeleteSubscriberDialogProps) => {
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onCancel();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete subscriber</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete{' '}
            <strong>{deletingItem?.name}</strong>? This will soft-delete the
            subscriber and they won&apos;t receive future notifications.
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

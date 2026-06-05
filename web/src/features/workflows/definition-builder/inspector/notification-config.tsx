'use client';

import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { NotificationConfigProps } from '@/features/workflows/types/ui';

export const NotificationConfig = ({
  draft,
  onConfigureNotificationNode,
}: NotificationConfigProps) => {
  const notificationChannel = draft.channel || 'email';

  const contentHint =
    notificationChannel === 'sms'
      ? 'SMS body is rendered from the linked SMS template body at send time.'
      : notificationChannel === 'push'
        ? 'Push title and message are rendered from the linked push template at send time.'
        : 'Email subject and body are rendered from the linked email template at send time.';

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Notification content
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{contentHint}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Delivery type: {notificationChannel.toUpperCase()}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() =>
              onConfigureNotificationNode?.(draft.id, notificationChannel)
            }
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

'use client';

import { Icon } from '@iconify/react';
import { Badge } from '@/components/ui/badge';

interface DeliveryEvent {
  id: string;
  channel: string;
  destination: string;
  status: string;
  error_message?: string;
  provider_message_id?: string;
}

interface DeliveryEventCardProps {
  readonly event: DeliveryEvent;
}

const channelIcon = (channel: string) => {
  switch (channel) {
    case 'email':
      return 'tabler:mail';
    case 'sms':
      return 'tabler:message';
    case 'push':
      return 'tabler:bell';
    default:
      return 'tabler:send';
  }
};

const statusBadge = (status: string) => {
  switch (status) {
    case 'sent':
      return 'lightSuccess' as const;
    case 'failed':
      return 'lightError' as const;
    case 'pending':
      return 'lightWarning' as const;
    case 'skipped':
      return 'default' as const;
    default:
      return 'default' as const;
  }
};

export function DeliveryEventCard({ event }: DeliveryEventCardProps) {
  return (
    <div className="rounded-md border border-border px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon
            icon={channelIcon(event.channel)}
            className="h-4 w-4 shrink-0 text-muted-foreground"
          />
          <span className="text-sm font-medium capitalize">
            {event.channel}
          </span>
          {event.destination && (
            <span className="text-xs text-muted-foreground truncate">
              → {event.destination}
            </span>
          )}
        </div>
        <Badge
          variant={statusBadge(event.status)}
          className="shrink-0 rounded-md text-xs capitalize"
        >
          {event.status}
        </Badge>
      </div>
      {event.error_message && (
        <p className="mt-1 text-xs text-destructive">{event.error_message}</p>
      )}
    </div>
  );
}

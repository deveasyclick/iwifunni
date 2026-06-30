'use client';

import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Play, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { SubscriberSearch } from '@/features/workflows/configure/components/SubscriberSearch';
import { SubscriberInfoEditor } from './components/SubscriberInfoEditor';
import { PayloadEditor } from './components/PayloadEditor';
import { DeliveryEventCard } from './components/DeliveryEventCard';
import { useTriggerWorkflowDialog } from './hooks/use-trigger-workflow-dialog';

interface TriggerWorkflowDialogProps {
  readonly workflowId: string;
  readonly workflowKey: string;
  readonly selectedChannels: string[];
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

export function TriggerWorkflowDialog({
  workflowId,
  workflowKey: _workflowKey,
  selectedChannels,
}: TriggerWorkflowDialogProps) {
  const {
    open,
    setOpen,
    selectedSubscriber,
    setSelectedSubscriber,
    payloadObj,
    setPayloadObj,
    notificationId,
    resetNotificationId,
    isTriggering,
    isPolling,
    isDone,
    events,
    hasError,
    triggerError,
    isValid,
    handleTrigger,
    handleSelectSubscriber,
    handleOpenChange,
    handleClearSubscriber,
    subscriberSearch,
    userEmail,
  } = useTriggerWorkflowDialog({
    workflowId,
    selectedChannels,
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="default"
          className="w-full gap-2"
          disabled={selectedChannels.length === 0}
        >
          <Play className="h-4 w-4" />
          Trigger workflow
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Trigger workflow</DialogTitle>
          <DialogDescription>
            Send a notification through this workflow to a subscriber. Events
            are shown in real time as each channel is processed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Subscriber selection and info */}
          <div className="space-y-3">
            <Label>Subscriber</Label>

            <SubscriberSearch
              searchQuery={subscriberSearch.searchQuery}
              onSearchQueryChange={subscriberSearch.setSearchQuery}
              isSearching={subscriberSearch.isSearching}
              searchResults={subscriberSearch.searchResults}
              onSelect={handleSelectSubscriber}
              onClear={handleClearSubscriber}
              previewSubscriberId={selectedSubscriber?.id}
            />

            {selectedSubscriber && (
              <SubscriberInfoEditor
                subscriber={selectedSubscriber}
                userEmail={userEmail}
                onChange={setSelectedSubscriber}
                onReset={resetNotificationId}
              />
            )}
          </div>

          {/* Channels summary */}
          {selectedChannels.length > 0 && (
            <div className="space-y-2">
              <Label>Channels to send</Label>
              <div className="flex flex-wrap gap-2">
                {selectedChannels.map((ch) => (
                  <Badge
                    key={ch}
                    variant="outline"
                    className="flex items-center gap-1.5 rounded-md text-xs capitalize"
                  >
                    <Icon icon={channelIcon(ch)} className="h-3 w-3" />
                    {ch}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Payload */}
          <PayloadEditor
            payload={payloadObj}
            onChange={setPayloadObj}
            onReset={resetNotificationId}
          />

          {/* Triggering indicator */}
          {isTriggering && (
            <div className="rounded-md border border-border px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Triggering workflow&hellip;</span>
              </div>
            </div>
          )}

          {/* Polling indicator */}
          {isPolling && (
            <div className="rounded-md border border-border px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>
                  {events.length === 0
                    ? 'Processing notification&hellip;'
                    : `Delivering via ${events.length} channel${
                        events.length > 1 ? 's' : ''
                      }&hellip;`}
                </span>
              </div>
            </div>
          )}

          {/* Error */}
          {hasError && triggerError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3">
              <p className="text-sm text-destructive">{triggerError}</p>
            </div>
          )}

          {/* Delivery events */}
          {(isPolling || isDone) && (
            <div className="space-y-3">
              <Separator />
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Delivery events</p>
                {notificationId && (
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="gap-1 h-7 text-xs"
                  >
                    <Link href={`/dashboard/notifications/${notificationId}`}>
                      View details
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </Button>
                )}
              </div>

              {events.length === 0 && (
                <div className="rounded-md border border-border px-4 py-3 text-sm text-muted-foreground">
                  No delivery events recorded.
                </div>
              )}

              {events.length > 0 && (
                <div className="space-y-2">
                  {events.map((event) => (
                    <DeliveryEventCard key={event.id} event={event} />
                  ))}
                </div>
              )}

              {/* Summary */}
              {events.length > 0 && (
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    {events.filter((e) => e.status === 'sent').length} sent
                  </span>
                  <span>
                    {events.filter((e) => e.status === 'failed').length} failed
                  </span>
                  <span>
                    {events.filter((e) => e.status === 'skipped').length}{' '}
                    skipped
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={handleTrigger}
              disabled={!isValid || isTriggering}
            >
              {isTriggering ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Triggering&hellip;
                </>
              ) : (
                'Trigger'
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

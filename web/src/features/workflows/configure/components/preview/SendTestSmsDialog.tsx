import { Loader2, PhoneOff, Send } from 'lucide-react';
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
import type { ReactNode } from 'react';

interface SendTestSmsDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly subscriberPhone: string;
  readonly subscriberName: string;
  readonly bodyLength?: number;
  readonly smsSenderId?: string;
  readonly sendStatus: 'idle' | 'sending' | 'sent' | 'error';
  readonly sendError: string;
  readonly onSend: () => void;
  readonly onClose: () => void;
  readonly children?: ReactNode;
}

export const SendTestSmsDialog = ({
  open,
  onOpenChange,
  subscriberPhone,
  subscriberName,
  bodyLength,
  smsSenderId,
  sendStatus,
  sendError,
  onSend,
  onClose,
}: SendTestSmsDialogProps) => {
  const sending = sendStatus === 'sending';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <Send className="h-3.5 w-3.5" />
          Test SMS
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Test SMS</DialogTitle>
          <DialogDescription>
            Send a preview of this SMS to a subscriber&apos;s phone for testing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {subscriberPhone ? (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Recipient
              </label>
              <div className="flex items-center gap-2 rounded-md border border-border/50 bg-muted/30 px-3 py-2 text-sm">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {subscriberName.charAt(0).toUpperCase()}
                </span>
                <span className="flex-1 truncate">
                  <span className="font-medium text-foreground">
                    {subscriberName}
                  </span>
                  <span className="ml-1.5 text-muted-foreground">
                    {subscriberPhone}
                  </span>
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border/40 bg-muted/15 px-4 py-5 text-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/50">
                <PhoneOff className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">
                  No recipient selected
                </p>
                <p className="text-xs text-muted-foreground">
                  Open the{' '}
                  <span className="font-medium text-foreground">Data</span>{' '}
                  panel and pick a subscriber with a phone number to send a test
                  SMS.
                </p>
              </div>
            </div>
          )}

          <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Preview info</p>
            <p className="mt-1">
              Body length:{' '}
              {bodyLength !== undefined
                ? `${bodyLength} characters`
                : '—'}
              {bodyLength !== undefined && bodyLength > 160 && (
                <span className="ml-1 text-amber-500">
                  (will be sent as {Math.ceil(bodyLength / 160)} messages)
                </span>
              )}
            </p>
            {smsSenderId && <p>Sender ID: {smsSenderId}</p>}
          </div>

          {sendStatus === 'sent' && (
            <p className="text-sm text-green-600">
              ✓ Test SMS sent successfully!
            </p>
          )}

          {sendStatus === 'error' && (
            <p className="text-sm text-destructive">
              {sendError || 'Failed to send test SMS. Please try again.'}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onSend}
            disabled={sending || !subscriberPhone}
            className="gap-1.5"
          >
            {sending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                Send Test
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

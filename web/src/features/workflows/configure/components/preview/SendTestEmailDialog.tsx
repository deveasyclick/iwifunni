import { Loader2, Send } from 'lucide-react';
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

interface SendTestEmailDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly subscriberEmail: string;
  readonly subscriberName: string;
  readonly previewSubject: string;
  readonly labelsSubject: string;
  readonly senderLine: string;
  readonly senderName?: string;
  readonly senderEmail?: string;
  readonly sendStatus: 'idle' | 'sending' | 'sent' | 'error';
  readonly sendError: string;
  readonly onSend: () => void;
  readonly onClose: () => void;
  readonly children?: ReactNode;
}

export const SendTestEmailDialog = ({
  open,
  onOpenChange,
  subscriberEmail,
  subscriberName,
  previewSubject,
  labelsSubject,
  senderLine,
  senderName,
  senderEmail,
  sendStatus,
  sendError,
  onSend,
  onClose,
}: SendTestEmailDialogProps) => {
  const sending = sendStatus === 'sending';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <Send className="h-3.5 w-3.5" />
          Test
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Test Email</DialogTitle>
          <DialogDescription>
            Send a preview of this email to a recipient for testing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {subscriberEmail ? (
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
                    {subscriberEmail}
                  </span>
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-border/60 bg-muted/20 px-3 py-4 text-center text-sm text-muted-foreground">
              Select a preview subscriber from the{' '}
              <span className="font-medium text-foreground">Data</span> panel to
              send a test email.
            </div>
          )}

          <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Preview info</p>
            <p className="mt-1">Subject: {previewSubject || labelsSubject}</p>
            <p>
              From:{' '}
              {senderLine ||
                `${senderName || 'Sender'} <${senderEmail || 'sender@example.com'}>`}
            </p>
          </div>

          {sendStatus === 'sent' && (
            <p className="text-sm text-green-600">
              ✓ Test email sent successfully!
            </p>
          )}

          {sendStatus === 'error' && (
            <p className="text-sm text-destructive">
              {sendError || 'Failed to send test email. Please try again.'}
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
            disabled={sending || !subscriberEmail}
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

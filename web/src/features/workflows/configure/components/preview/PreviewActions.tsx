import type { WorkflowChannel } from '@/app/types/workflow';
import { ViewToggle } from './ViewToggle';
import { SendTestEmailDialog } from './SendTestEmailDialog';

interface PreviewActionsProps {
  readonly channel: WorkflowChannel;
  readonly mobileView: boolean;
  readonly onMobileViewChange: (mobile: boolean) => void;
  readonly testEmailOpen: boolean;
  readonly onTestEmailOpenChange: (open: boolean) => void;
  readonly subscriberEmail: string;
  readonly subscriberName: string;
  readonly previewSubject: string;
  readonly labelsSubject: string;
  readonly senderLine: string;
  readonly senderName?: string;
  readonly senderEmail?: string;
  readonly sendStatus: 'idle' | 'sending' | 'sent' | 'error';
  readonly sendError: string;
  readonly onSendTest: () => void;
  readonly onCloseDialog: () => void;
}

/** Renders the view toggle and test email button for email channels. */
export const PreviewActions = ({
  channel,
  mobileView,
  onMobileViewChange,
  testEmailOpen,
  onTestEmailOpenChange,
  subscriberEmail,
  subscriberName,
  previewSubject,
  labelsSubject,
  senderLine,
  senderName,
  senderEmail,
  sendStatus,
  sendError,
  onSendTest,
  onCloseDialog,
}: PreviewActionsProps) => {
  if (channel !== 'email') return null;

  return (
    <div className="flex items-center gap-2">
      <ViewToggle mobileView={mobileView} onChange={onMobileViewChange} />
      <SendTestEmailDialog
        open={testEmailOpen}
        onOpenChange={onTestEmailOpenChange}
        subscriberEmail={subscriberEmail}
        subscriberName={subscriberName}
        previewSubject={previewSubject}
        labelsSubject={labelsSubject}
        senderLine={senderLine}
        senderName={senderName}
        senderEmail={senderEmail}
        sendStatus={sendStatus}
        sendError={sendError}
        onSend={onSendTest}
        onClose={onCloseDialog}
      />
    </div>
  );
};

import type { WorkflowChannel } from '@/app/types/workflow';
import { ViewToggle } from './ViewToggle';
import { SendTestEmailDialog } from './SendTestEmailDialog';
import { SendTestSmsDialog } from './SendTestSmsDialog';

interface PreviewActionsProps {
  readonly channel: WorkflowChannel;
  readonly mobileView: boolean;
  readonly onMobileViewChange: (mobile: boolean) => void;
  readonly testEmailOpen: boolean;
  readonly onTestEmailOpenChange: (open: boolean) => void;
  readonly testSmsOpen: boolean;
  readonly onTestSmsOpenChange: (open: boolean) => void;
  readonly subscriberEmail: string;
  readonly subscriberPhone: string;
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
  readonly onSendTestSms: () => void;
  readonly onCloseSmsDialog: () => void;
  readonly smsSendStatus: 'idle' | 'sending' | 'sent' | 'error';
  readonly smsSendError: string;
  readonly smsBodyLength?: number;
  readonly smsSenderId?: string;
}

/** Renders the view toggle and test send buttons for each channel type. */
export const PreviewActions = ({
  channel,
  mobileView,
  onMobileViewChange,
  testEmailOpen,
  onTestEmailOpenChange,
  testSmsOpen,
  onTestSmsOpenChange,
  subscriberEmail,
  subscriberPhone,
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
  onSendTestSms,
  onCloseSmsDialog,
  smsSendStatus,
  smsSendError,
  smsBodyLength,
  smsSenderId,
}: PreviewActionsProps) => {
  if (channel === 'email') {
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
  }

  if (channel === 'sms') {
    return (
      <div className="flex items-center gap-2">
        <SendTestSmsDialog
          open={testSmsOpen}
          onOpenChange={onTestSmsOpenChange}
          subscriberPhone={subscriberPhone}
          subscriberName={subscriberName}
          bodyLength={smsBodyLength}
          smsSenderId={smsSenderId}
          sendStatus={smsSendStatus}
          sendError={smsSendError}
          onSend={onSendTestSms}
          onClose={onCloseSmsDialog}
        />
      </div>
    );
  }

  return null;
};

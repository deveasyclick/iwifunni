import type { WorkflowChannel } from '@/app/types/workflow';
import { EmailPreviewCard } from './EmailPreviewCard';
import { MobilePhoneFrame } from './MobilePhoneFrame';
import { PushPreview } from './PushPreview';
import { SmsPreview } from './SmsPreview';

interface EmailPreviewProps {
  readonly mobileView: boolean;
  readonly senderInitial: string;
  readonly displaySenderName: string;
  readonly displaySenderLine: string;
  readonly displaySubject: string;
  readonly timeStr: string;
  readonly dateStr: string;
  readonly renderedBody: string | false;
  readonly renderedBodyDesktop: string | null;
  readonly loading: boolean;
}

function EmailPreview({
  mobileView,
  senderInitial,
  displaySenderName,
  displaySenderLine,
  displaySubject,
  timeStr,
  dateStr,
  renderedBody,
  renderedBodyDesktop,
  loading,
}: EmailPreviewProps) {
  if (mobileView) {
    return (
      <MobilePhoneFrame>
        <EmailPreviewCard
          compact
          senderInitial={senderInitial}
          displaySenderName={displaySenderName}
          displaySenderLine={displaySenderLine}
          displaySubject={displaySubject}
          timeStr={timeStr}
          dateStr={dateStr}
          renderedBody={renderedBody}
          loading={loading}
        />
      </MobilePhoneFrame>
    );
  }

  return (
    <EmailPreviewCard
      senderInitial={senderInitial}
      displaySenderName={displaySenderName}
      displaySenderLine={displaySenderLine}
      displaySubject={displaySubject}
      timeStr={timeStr}
      dateStr={dateStr}
      renderedBody={renderedBodyDesktop || renderedBody}
      loading={loading}
    />
  );
}

interface ChannelPreviewProps {
  readonly channel: WorkflowChannel;
  readonly mobileView: boolean;
  readonly senderInitial: string;
  readonly displaySenderName: string;
  readonly displaySenderLine: string;
  readonly displaySubject: string;
  readonly timeStr: string;
  readonly dateStr: string;
  readonly renderedBody: string | false;
  readonly renderedBodyDesktop: string | null;
  readonly loading: boolean;
}

/** Renders the appropriate preview for the selected channel type. */
export const ChannelPreview = ({
  channel,
  mobileView,
  senderInitial,
  displaySenderName,
  displaySenderLine,
  displaySubject,
  timeStr,
  dateStr,
  renderedBody,
  renderedBodyDesktop,
  loading,
}: ChannelPreviewProps) => {
  switch (channel) {
    case 'email':
      return (
        <EmailPreview
          mobileView={mobileView}
          senderInitial={senderInitial}
          displaySenderName={displaySenderName}
          displaySenderLine={displaySenderLine}
          displaySubject={displaySubject}
          timeStr={timeStr}
          dateStr={dateStr}
          renderedBody={renderedBody}
          renderedBodyDesktop={renderedBodyDesktop}
          loading={loading}
        />
      );
    case 'sms':
      return <SmsPreview renderedBody={renderedBody} />;
    case 'push':
      return (
        <PushPreview
          previewSubject={displaySubject}
          renderedBody={renderedBody}
        />
      );
    default:
      return null;
  }
};

'use client';

import type { WorkflowChannel } from '@/app/types/workflow';
import { request } from '@/lib/api-client';
import type { JSONContent } from '@tiptap/core';
import { useState } from 'react';
import { resolveTemplateVariables } from '../editors/encode';
import { useEmailPreview } from '../hooks/use-email-preview';
import {
  usePreviewSubject,
  useRenderedBody,
  useRenderedBodyDesktop,
} from '../hooks/use-preview-state';
import type { PreviewSubscriber } from '../types/data-panel';
import { ChannelPreview } from './components/preview/ChannelPreview';
import { PreviewActions } from './components/preview/PreviewActions';
import {
  buildSubscriberDisplayName,
  formatDate,
  formatSenderLine,
  formatTime,
  getDisplaySenderLine,
  getDisplaySenderName,
  getSenderInitial,
} from '../utils/preview';

type ChannelPreviewPanelProps = {
  readonly channel: WorkflowChannel;
  readonly subject: string;
  readonly body: string;
  readonly contentJson?: JSONContent | null;
  readonly labels: { subject: string; body: string };
  readonly previewContext?: Record<string, unknown>;
  readonly previewSubscriber?: PreviewSubscriber | null;
  readonly senderName?: string;
  readonly senderEmail?: string;
};

function PreviewHeader() {
  return (
    <div>
      <h6 className="font-medium text-foreground">Preview</h6>
      <p className="mt-1 text-sm text-muted-foreground">
        Live preview of the content that will be used for this notification.
      </p>
    </div>
  );
}

export const ChannelPreviewPanel = ({
  channel,
  subject,
  body,
  contentJson,
  labels,
  previewContext,
  previewSubscriber,
  senderName,
  senderEmail,
}: ChannelPreviewPanelProps) => {
  const [mobileView, setMobileView] = useState(false);
  const [testEmailOpen, setTestEmailOpen] = useState(false);
  const [sendStatus, setSendStatus] = useState<
    'idle' | 'sending' | 'sent' | 'error'
  >('idle');
  const [sendError, setSendError] = useState('');

  // --- Data derivation ---
  const subscriberEmail = previewSubscriber?.email ?? '';
  const subscriberName = buildSubscriberDisplayName(
    previewSubscriber?.firstName,
    previewSubscriber?.lastName,
  );

  const previewSubject = usePreviewSubject(
    subject,
    labels.subject,
    previewContext,
  );
  const { html: mailyHtml, loading: mailyLoading } = useEmailPreview(
    channel,
    body,
    contentJson,
    previewContext,
  );

  const renderedBodyDesktop = useRenderedBodyDesktop(mailyHtml);
  const renderedBody = useRenderedBody(
    body,
    channel,
    previewContext,
    mailyHtml,
  );

  const senderLine = formatSenderLine(senderName, senderEmail);
  const timeStr = formatTime();
  const dateStr = formatDate();
  const senderInitial = getSenderInitial(senderName);
  const displaySenderName = getDisplaySenderName(senderName);
  const displaySenderLine = getDisplaySenderLine(senderLine);
  const displaySubject = previewSubject || '(no subject)';

  // --- Handlers ---
  const handleSendTest = async () => {
    if (!subscriberEmail) return;
    setSendStatus('sending');
    setSendError('');

    const resolvedBody = previewContext
      ? resolveTemplateVariables(body, previewContext)
      : body;
    const emailHtml = mailyHtml || resolvedBody;

    try {
      await request('/api/notifications/test-send', {
        method: 'POST',
        body: {
          recipient_email: subscriberEmail,
          subject: previewSubject,
          body: emailHtml,
          sender_name: senderName,
          sender_email: senderEmail,
        },
      });
      setSendStatus('sent');
      setTimeout(() => {
        setTestEmailOpen(false);
        setSendStatus('idle');
      }, 2000);
    } catch (err) {
      setSendStatus('error');
      setSendError(err instanceof Error ? err.message : 'Failed to send');
    }
  };

  const handleCloseDialog = () => {
    setTestEmailOpen(false);
    setSendStatus('idle');
    setSendError('');
  };

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <PreviewHeader />
        <PreviewActions
          channel={channel}
          mobileView={mobileView}
          onMobileViewChange={setMobileView}
          testEmailOpen={testEmailOpen}
          onTestEmailOpenChange={setTestEmailOpen}
          subscriberEmail={subscriberEmail}
          subscriberName={subscriberName}
          previewSubject={previewSubject}
          labelsSubject={labels.subject}
          senderLine={senderLine}
          senderName={senderName}
          senderEmail={senderEmail}
          sendStatus={sendStatus}
          sendError={sendError}
          onSendTest={handleSendTest}
          onCloseDialog={handleCloseDialog}
        />
      </div>

      <ChannelPreview
        channel={channel}
        mobileView={mobileView}
        senderInitial={senderInitial}
        displaySenderName={displaySenderName}
        displaySenderLine={displaySenderLine}
        displaySubject={displaySubject}
        timeStr={timeStr}
        dateStr={dateStr}
        renderedBody={renderedBody}
        renderedBodyDesktop={renderedBodyDesktop}
        loading={mailyLoading}
      />
    </div>
  );
};

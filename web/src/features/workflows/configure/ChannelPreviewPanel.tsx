'use client';

import type { WorkflowChannel } from '@/app/types/workflow';
import type { JSONContent } from '@tiptap/core';
import { useMemo, useState } from 'react';
import { resolveTemplateVariables } from '../editors/encode';
import { useEmailPreview } from '../hooks/use-email-preview';
import {
  usePreviewSubject,
  useRenderedBody,
  useRenderedBodyDesktop,
} from '../hooks/use-preview-state';
import { useTestSend } from '../queries';
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
  readonly smsSenderId?: string;
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

function sendStatusValue(
  isPending: boolean,
  isSuccess: boolean,
  isError: boolean,
): 'sending' | 'sent' | 'error' | 'idle' {
  if (isPending) return 'sending';
  if (isSuccess) return 'sent';
  if (isError) return 'error';
  return 'idle';
}

function sendErrorMessage(error: unknown, fallback: string): string {
  if (!error) return '';
  if (error instanceof Error) return error.message;
  return fallback;
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
  smsSenderId,
}: ChannelPreviewPanelProps) => {
  const [mobileView, setMobileView] = useState(false);
  const [testEmailOpen, setTestEmailOpen] = useState(false);
  const [testSmsOpen, setTestSmsOpen] = useState(false);

  const testSendMutation = useTestSend();

  // --- Data derivation ---
  const subscriberEmail = previewSubscriber?.email ?? '';
  const subscriberPhone = previewSubscriber?.phone ?? '';
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

  // For SMS, renderedBody may contain HTML tags from renderPreview.
  // Resolve variables as plain text so no <strong> tags leak into the bubble.
  const smsRenderedBody = useMemo(() => {
    if (channel !== 'sms') return renderedBody;
    if (!body.trim()) return 'Start editing to see a live SMS preview.';
    return previewContext
      ? resolveTemplateVariables(body, previewContext)
      : body;
  }, [channel, body, previewContext, renderedBody]);

  const senderLine = formatSenderLine(senderName, senderEmail);
  const timeStr = formatTime();
  const dateStr = formatDate();
  const senderInitial = getSenderInitial(senderName);
  const displaySenderName = getDisplaySenderName(senderName);
  const displaySenderLine = getDisplaySenderLine(senderLine);
  const displaySubject = previewSubject || '(no subject)';

  // --- Unified test send handler ---
  const handleSendTest = async (sms?: boolean) => {
    const targetChannel = sms ? 'sms' : 'email';

    if (targetChannel === 'email' && !subscriberEmail) return;
    if (targetChannel === 'sms' && !subscriberPhone) return;

    const resolvedBody = previewContext
      ? resolveTemplateVariables(body, previewContext)
      : body;

    try {
      await testSendMutation.mutateAsync(
        targetChannel === 'email'
          ? {
              channel: 'email',
              recipient_email: subscriberEmail,
              subject: previewSubject,
              body: mailyHtml || resolvedBody,
              sender_name: senderName,
              sender_email: senderEmail,
            }
          : {
              channel: 'sms',
              recipient_phone: subscriberPhone,
              body: resolvedBody,
              sender_id: smsSenderId,
            },
      );

      // Auto-close dialog after brief success display
      setTimeout(() => {
        if (targetChannel === 'email') {
          setTestEmailOpen(false);
        } else {
          setTestSmsOpen(false);
        }
        testSendMutation.reset();
      }, 2000);
    } catch {
      // Error is surfaced via mutation state
    }
  };

  const handleCloseDialog = () => {
    setTestEmailOpen(false);
    testSendMutation.reset();
  };

  const handleCloseSmsDialog = () => {
    setTestSmsOpen(false);
    testSendMutation.reset();
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
          testSmsOpen={testSmsOpen}
          onTestSmsOpenChange={setTestSmsOpen}
          subscriberEmail={subscriberEmail}
          subscriberPhone={subscriberPhone}
          subscriberName={subscriberName}
          previewSubject={previewSubject}
          labelsSubject={labels.subject}
          senderLine={senderLine}
          senderName={senderName}
          senderEmail={senderEmail}
          sendStatus={sendStatusValue(
            testSendMutation.isPending,
            testSendMutation.isSuccess,
            testSendMutation.isError,
          )}
          sendError={sendErrorMessage(
            testSendMutation.isError ? testSendMutation.error : null,
            'Failed to send',
          )}
          onSendTest={() => handleSendTest(false)}
          onCloseDialog={handleCloseDialog}
          smsBodyLength={(smsRenderedBody || '').length}
          smsSenderId={smsSenderId}
          onSendTestSms={() => handleSendTest(true)}
          onCloseSmsDialog={handleCloseSmsDialog}
          smsSendStatus={sendStatusValue(
            testSendMutation.isPending,
            testSendMutation.isSuccess,
            testSendMutation.isError,
          )}
          smsSendError={sendErrorMessage(
            testSendMutation.isError ? testSendMutation.error : null,
            'Failed to send SMS',
          )}
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
        renderedBody={channel === 'sms' ? smsRenderedBody : renderedBody}
        renderedBodyDesktop={renderedBodyDesktop}
        loading={mailyLoading}
        smsSenderId={smsSenderId}
      />
    </div>
  );
};

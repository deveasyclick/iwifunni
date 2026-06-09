'use client';

import { useMemo } from 'react';
import type { WorkflowChannel } from '@/app/types/workflow';
import { renderPreview } from '../editors/encode';

type ChannelPreviewPanelProps = {
  channel: WorkflowChannel;
  subject: string;
  body: string;
  labels: { subject: string; body: string };
  previewContext?: Record<string, unknown>;
  senderName?: string;
  senderEmail?: string;
};

export const ChannelPreviewPanel = ({
  channel,
  subject,
  body,
  labels,
  previewContext,
  senderName,
  senderEmail,
}: ChannelPreviewPanelProps) => {
  const previewSubject = useMemo(() => {
    if (!subject.trim()) return labels.subject;
    return previewContext ? renderPreview(subject, previewContext) : subject;
  }, [subject, labels.subject, previewContext]);

  const renderedBody = useMemo(() => {
    if (!body.trim()) return `Preview your ${channel} content here.`;
    return previewContext ? renderPreview(body, previewContext) : body;
  }, [body, channel, previewContext]);

  const senderLine =
    senderName && senderEmail ? `${senderName} <${senderEmail}>` : '';

  // Fake a plausible timestamp
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  const dateStr = now.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5">
      <div className="mb-4">
        <h6 className="font-medium text-foreground">Preview</h6>
        <p className="mt-1 text-sm text-muted-foreground">
          Live preview of the content that will be used for this notification.
        </p>
      </div>

      {channel === 'email' ? (
        <div className="overflow-hidden rounded-xl border border-border/50 bg-white text-slate-900 shadow-sm">
          {/* Email header — inbox style */}
          <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
            <div className="flex items-start gap-3">
              {/* Avatar circle with first letter */}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-semibold text-primary-foreground">
                {(senderName || '?')[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {senderName || 'Sender'}
                  </p>
                  <span className="shrink-0 text-[11px] text-slate-400">
                    {timeStr}
                  </span>
                </div>
                <p className="truncate text-[13px] text-slate-500">
                  {senderLine || 'sender@example.com'}
                </p>
                <p className="mt-2 text-[13px] font-medium text-slate-800">
                  {previewSubject || '(no subject)'}
                </p>
              </div>
            </div>
            {/* Inbox metadata line */}
            <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-400">
              <span>to me</span>
              <span>{dateStr}</span>
            </div>
          </div>

          {/* Email body */}
          <div className="border-t border-slate-200">
            <div className="px-1 py-1">
              {renderedBody ? (
                <iframe
                  srcDoc={renderedBody}
                  title="Email preview"
                  className="h-105 w-full border-0"
                  sandbox="allow-same-origin"
                />
              ) : (
                <p className="px-4 py-8 text-center text-sm text-slate-400">
                  Start editing to see a live preview.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {channel === 'sms' ? (
        <div className="rounded-[28px] border border-border/40 bg-dark p-4">
          <div className="ml-auto max-w-[85%] rounded-3xl bg-primary px-4 py-3 text-sm leading-6 text-primary-foreground shadow-lg whitespace-pre-wrap">
            {renderedBody}
          </div>
        </div>
      ) : null}

      {channel === 'push' ? (
        <div className="rounded-3xl border border-border/40 bg-dark p-4">
          <div className="rounded-2xl border border-border/50 bg-card px-4 py-3 shadow-lg">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Iwifunni notification
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {previewSubject}
            </p>
            <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
              {renderedBody}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

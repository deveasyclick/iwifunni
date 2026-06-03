'use client';

import type { WorkflowChannel } from '@/app/types/workflow';

type ChannelPreviewPanelProps = {
  channel: WorkflowChannel;
  subject: string;
  body: string;
  emailPreviewHtml: string;
  labels: { subject: string; body: string };
};

export const ChannelPreviewPanel = ({
  channel,
  subject,
  body,
  emailPreviewHtml,
  labels,
}: ChannelPreviewPanelProps) => {
  const previewSubject = subject.trim() || labels.subject;
  const previewBody = body.trim() || `Preview your ${channel} content here.`;

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5">
      <div className="mb-4">
        <h6 className="font-medium text-foreground">Preview</h6>
        <p className="mt-1 text-sm text-muted-foreground">
          Live preview of the content that will be used for this notification.
        </p>
      </div>

      {channel === 'email' ? (
        <div className="rounded-2xl border border-border/50 bg-white text-slate-900 shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Subject
            </p>
            <p className="mt-2 text-sm font-semibold">{previewSubject}</p>
          </div>
          <div className="px-1 py-1">
            {emailPreviewHtml ? (
              <iframe
                srcDoc={emailPreviewHtml}
                title="Email preview"
                className="h-[480px] w-full rounded-b-xl border-0"
                sandbox="allow-same-origin"
              />
            ) : (
              <p className="px-3 py-4 text-sm text-slate-400">
                Start editing to see a live preview.
              </p>
            )}
          </div>
        </div>
      ) : null}

      {channel === 'sms' ? (
        <div className="rounded-[28px] border border-border/40 bg-dark p-4">
          <div className="ml-auto max-w-[85%] rounded-3xl bg-primary px-4 py-3 text-sm leading-6 text-primary-foreground shadow-lg whitespace-pre-wrap">
            {previewBody}
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
              {previewBody}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

'use client';

import type { WorkflowChannel } from '@/app/types/workflow';
import type { PreviewSubscriber } from '../types/data-panel';
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

import { request } from '@/lib/api-client';
import type { JSONContent } from '@tiptap/core';
import { Loader2, Monitor, Send, Smartphone } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { renderPreview, resolveTemplateVariables } from '../editors/encode';

type ChannelPreviewPanelProps = {
  channel: WorkflowChannel;
  subject: string;
  body: string;
  contentJson?: JSONContent | null;
  labels: { subject: string; body: string };
  previewContext?: Record<string, unknown>;
  previewSubscriber?: PreviewSubscriber | null;
  senderName?: string;
  senderEmail?: string;
};

type EmailPreviewCardProps = {
  compact?: boolean;
  senderInitial: string;
  displaySenderName: string;
  displaySenderLine: string;
  displaySubject: string;
  timeStr: string;
  dateStr: string;
  renderedBody: string | false;
  loading?: boolean;
};

/** Shared email card for desktop and mobile views. */
const EmailPreviewCard = ({
  compact,
  senderInitial,
  displaySenderName,
  displaySenderLine,
  displaySubject,
  timeStr,
  dateStr,
  renderedBody,
  loading = false,
}: EmailPreviewCardProps) => {
  const s = compact
    ? {
        avatar: 'h-7 w-7 text-[11px]',
        headerPad: 'px-4 py-3',
        gap: 'gap-2',
        nameSize: 'text-xs',
        emailSize: 'text-[11px]',
        timeSize: 'text-[10px]',
        subjectSize: 'text-xs',
        bodyHeight: 'h-75',
        emptyPad: 'px-4 py-8 text-xs',
      }
    : {
        avatar: 'h-9 w-9 text-[13px]',
        headerPad: 'px-5 py-4',
        gap: 'gap-3',
        nameSize: 'text-sm',
        emailSize: 'text-[13px]',
        timeSize: 'text-[11px]',
        subjectSize: 'text-[13px]',
        bodyHeight: 'h-105',
        emptyPad: 'px-4 py-8 text-sm',
      };

  return (
    <div className="overflow-hidden rounded-xl border border-border/50 bg-white text-slate-900 shadow-sm">
      <div
        className={`border-b border-slate-200 bg-slate-50/80 ${s.headerPad}`}
      >
        <div className={`flex items-start ${s.gap}`}>
          <div
            className={`flex ${s.avatar} shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground`}
          >
            {senderInitial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <p
                className={`truncate font-semibold text-slate-900 ${s.nameSize}`}
              >
                {displaySenderName}
              </p>
              <span className={`shrink-0 text-slate-400 ${s.timeSize}`}>
                {timeStr}
              </span>
            </div>
            <p className={`truncate text-slate-500 ${s.emailSize}`}>
              {displaySenderLine}
            </p>
            <p className={`mt-2 font-medium text-slate-800 ${s.subjectSize}`}>
              {displaySubject}
            </p>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-400">
          <span>to me</span>
          <span>{dateStr}</span>
        </div>
      </div>
      <div className="border-t border-slate-200">
        <div className="px-1 py-1">
          {loading ? (
            <div className={`flex items-center justify-center ${s.bodyHeight}`}>
              <div className="flex flex-col items-center gap-2 text-xs text-slate-400">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-500" />
                <span>Rendering preview…</span>
              </div>
            </div>
          ) : renderedBody ? (
            <iframe
              srcDoc={renderedBody}
              title="Email preview"
              className={`w-full border-0 ${s.bodyHeight}`}
              sandbox="allow-same-origin"
            />
          ) : (
            <p className={`text-center text-slate-400 ${s.emptyPad}`}>
              Start editing to see a live preview.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Renders Maily JSON content into proper email HTML using @maily-to/render.
 * Falls back to the simple renderPreview ({{path}} substitution) when
 * contentJson is not available (initial load or SMS/push channels).
 */
function useEmailPreview(
  channel: WorkflowChannel,
  body: string,
  contentJson: JSONContent | null | undefined,
  previewContext: Record<string, unknown> | undefined,
): { html: string | null; loading: boolean } {
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Track the most recent render request so we can cancel stale ones
  const renderIdRef = useRef(0);

  useEffect(() => {
    if (channel !== 'email' || !contentJson) {
      // Fall back to simple {{path}} substitution
      setLoading(false);
      setHtml(null);
      return;
    }

    const id = ++renderIdRef.current;
    let cancelled = false;
    setLoading(true);

    const render = async () => {
      try {
        // Dynamic import to avoid bundling heavy deps on non-email pages
        const { Maily } = await import('@maily-to/render');

        if (cancelled) return;

        const maily = new Maily(contentJson);

        // Set variable values from preview context
        if (previewContext) {
          const stringValues: Record<string, string> = {};
          for (const [key, value] of Object.entries(previewContext)) {
            if (
              typeof value === 'string' ||
              typeof value === 'number' ||
              typeof value === 'boolean'
            ) {
              stringValues[key] = String(value);
            }
          }
          if (Object.keys(stringValues).length > 0) {
            maily.setVariableValues(stringValues);
          }
        }

        const emailHtml = await maily.render({ pretty: false });

        if (!cancelled && id === renderIdRef.current) {
          setHtml(emailHtml);
        }
      } catch (err) {
        console.error(
          'Failed to render email preview with @maily-to/render, falling back:',
          err,
        );
        if (!cancelled) {
          // Fall back to simple rendering on error
          setHtml(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    render();

    return () => {
      cancelled = true;
    };
  }, [channel, contentJson, previewContext]);

  // When contentJson is not available, the parent component passes null.
  // In that case, return null so the caller can fall through to renderPreview.
  return { html, loading };
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
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<
    'idle' | 'sending' | 'sent' | 'error'
  >('idle');
  const [sendError, setSendError] = useState('');

  const subscriberEmail = previewSubscriber?.email ?? '';
  const subscriberName =
    [previewSubscriber?.firstName, previewSubscriber?.lastName]
      .filter(Boolean)
      .join(' ') || 'Selected subscriber';

  const previewSubject = useMemo(() => {
    if (!subject.trim()) return labels.subject;
    return previewContext ? renderPreview(subject, previewContext) : subject;
  }, [subject, labels.subject, previewContext]);

  // Use @maily-to/render for proper email HTML; fall back to simple
  // {{path}} substitution when JSON content isn't available yet.
  const { html: mailyHtml, loading: mailyLoading } = useEmailPreview(
    channel,
    body,
    contentJson,
    previewContext,
  );

  // Derive a desktop-specific version of the rendered HTML that disables the
  // column-stacking media query (max-width:425px). The @maily-to/render library
  // emits CSS that stacks .tab-col-full columns below 425px — that's correct
  // for real email clients on mobile, but the preview iframe is often narrower
  // than 425px because of panel padding/borders, causing columns to incorrectly
  // stack even in the "desktop" preview.
  const renderedBodyDesktop = useMemo(() => {
    if (!mailyHtml) return null;
    // Shift the breakpoint to 1px so it's never triggered in the desktop view
    return mailyHtml.replace('max-width:425px', 'max-width:1px');
  }, [mailyHtml]);

  const renderedBody = useMemo(() => {
    if (!body.trim()) return `Preview your ${channel} content here.`;

    // When Maily JSON is available, use the properly rendered email HTML
    if (mailyHtml) return mailyHtml;

    // Fall back to simple {{path}} substitution
    return previewContext ? renderPreview(body, previewContext) : body;
  }, [body, channel, previewContext, mailyHtml]);

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

  const senderInitial = (senderName || '?')[0].toUpperCase();
  const displaySenderName = senderName || 'Sender';
  const displaySenderLine = senderLine || 'sender@example.com';
  const displaySubject = previewSubject || '(no subject)';

  const handleSendTest = async () => {
    if (!subscriberEmail) return;
    setSending(true);
    setSendStatus('sending');
    setSendError('');

    // Use the Maily-rendered email HTML when available (proper email markup
    // with tables, inline styles, and resolved variables). Fall back to a
    // simple {{path}} substitution for channels/content without a Maily JSON
    // representation.
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
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5">
      {/* Header with preview toggle and test button */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h6 className="font-medium text-foreground">Preview</h6>
          <p className="mt-1 text-sm text-muted-foreground">
            Live preview of the content that will be used for this notification.
          </p>
        </div>

        {channel === 'email' && (
          <div className="flex items-center gap-2">
            {/* Desktop / Mobile toggle */}
            <div className="flex overflow-hidden rounded-md border border-border/50">
              <button
                type="button"
                onClick={() => setMobileView(false)}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs transition-colors ${
                  !mobileView
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Monitor className="h-3.5 w-3.5" />
                Desktop
              </button>
              <button
                type="button"
                onClick={() => setMobileView(true)}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs transition-colors ${
                  mobileView
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
                Mobile
              </button>
            </div>

            {/* Send Test Email button */}
            <Dialog open={testEmailOpen} onOpenChange={setTestEmailOpen}>
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
                      <span className="font-medium text-foreground">
                        Data
                      </span>{' '}
                      panel to send a test email.
                    </div>
                  )}

                  <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">Preview info</p>
                    <p className="mt-1">
                      Subject: {previewSubject || labels.subject}
                    </p>
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
                      {sendError ||
                        'Failed to send test email. Please try again.'}
                    </p>
                  )}
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setTestEmailOpen(false);
                      setSendStatus('idle');
                      setSendError('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSendTest}
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
          </div>
        )}
      </div>

      {channel === 'email' ? (
        mobileView ? (
          /* Mobile phone frame — use original HTML with responsive CSS
             (columns correctly stack below 425px) */
          <div className="mx-auto max-w-[375px]">
            <div className="overflow-hidden rounded-[44px] border-[3px] border-border/60 bg-dark shadow-xl">
              <div className="relative flex justify-center pt-3">
                <div className="h-5 w-28 rounded-b-xl bg-black" />
              </div>
              <div className="px-2 pb-2 pt-2">
                <EmailPreviewCard
                  compact
                  senderInitial={senderInitial}
                  displaySenderName={displaySenderName}
                  displaySenderLine={displaySenderLine}
                  displaySubject={displaySubject}
                  timeStr={timeStr}
                  dateStr={dateStr}
                  renderedBody={renderedBody}
                  loading={mailyLoading}
                />
              </div>
              <div className="flex justify-center pb-3">
                <div className="h-1 w-32 rounded-full bg-white/30" />
              </div>
            </div>
          </div>
        ) : (
          /* Desktop view — use the version with the 425px breakpoint
             disabled so columns stay side-by-side */
          <EmailPreviewCard
            senderInitial={senderInitial}
            displaySenderName={displaySenderName}
            displaySenderLine={displaySenderLine}
            displaySubject={displaySubject}
            timeStr={timeStr}
            dateStr={dateStr}
            renderedBody={renderedBodyDesktop || renderedBody}
            loading={mailyLoading}
          />
        )
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

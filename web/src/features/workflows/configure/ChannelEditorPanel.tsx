'use client';

import type { JSONContent } from '@tiptap/core';
import { useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import type { WorkflowChannel } from '@/app/types/workflow';
import { DEFAULT_VARIABLE_GROUPS } from '../constants/variables';
import { mailyVariablesToText, textToMailyVariables } from '../editors/encode';
import { SenderDrawer } from './SenderDrawer';

const MailyEmailEditor = dynamic(
  () => import('../editors/maily-email-editor'),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-140 items-center justify-center rounded-xl border border-border/50">
        <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading email editor…</span>
        </div>
      </div>
    ),
  },
);

const SubjectEditor = dynamic(
  () => import('../editors/subject-editor').then((m) => m.SubjectEditor),
  { ssr: false },
);

type ChannelEditorPanelProps = {
  channel: WorkflowChannel;
  subject: string;
  body: string;
  labels: { subject: string; body: string };
  payload: string;
  senderName: string;
  senderEmail: string;
  useDefaults: boolean;
  hasProvider: boolean;
  providerLoading: boolean;
  providerName: string;
  providerEmail: string;
  onSenderChange: (name: string, email: string, useDefaults: boolean) => void;
  onSubjectChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onHtmlChange: (html: string, json?: JSONContent | null) => void;
  autosaveStatus: 'idle' | 'saving' | 'saved' | 'error';
};

export const ChannelEditorPanel = ({
  channel,
  subject,
  body,
  labels,
  payload,
  senderName,
  senderEmail,
  useDefaults,
  hasProvider,
  providerLoading,
  providerName,
  providerEmail,
  onSenderChange,
  onSubjectChange,
  onBodyChange,
  onHtmlChange,
  autosaveStatus,
}: ChannelEditorPanelProps) => {
  // Merge static variable groups with dynamic payload variables
  const allVariables = useMemo(() => {
    const staticVars = DEFAULT_VARIABLE_GROUPS.flatMap((g) => g.variables);

    // Parse payload JSON and create dynamic payload.* variables
    const payloadVars: Array<{
      path: string;
      label: string;
      type: string;
      description: string;
    }> = [];
    try {
      const payloadObj: Record<string, unknown> = JSON.parse(payload);
      if (typeof payloadObj === 'object' && payloadObj !== null) {
        for (const key of Object.keys(payloadObj)) {
          payloadVars.push({
            path: `payload.${key}`,
            label: key,
            type: typeof payloadObj[key],
            description: `Payload field: ${key}`,
          });
        }
      }
    } catch {
      // Invalid JSON — skip
      console.log('Invalid JSON payload', payload);
    }

    return payloadVars.length > 0
      ? [
          ...staticVars,
          {
            path: 'payload',
            label: 'Payload',
            type: 'object',
            description: 'User-defined test payload',
          },
          ...payloadVars,
        ]
      : staticVars;
  }, [payload]);

  // Convert Maily's HTML format → {{path}} before persisting;
  // forward the raw JSON content for proper email rendering in the preview.
  const handleHtmlChange = useCallback(
    (html: string, json?: JSONContent | null) => {
      onHtmlChange(mailyVariablesToText(html), json);
    },
    [onHtmlChange],
  );

  // Convert {{path}} → Maily's HTML format when loading into editor
  const editorInitialValue = useMemo(
    () => textToMailyVariables(body, allVariables),
    [body, allVariables],
  );

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h6 className="font-medium text-foreground">Editor</h6>
          <p className="mt-1 text-sm text-muted-foreground">
            Update the template content for this workflow step.
          </p>
        </div>
        {autosaveStatus === 'saving' && (
          <span className="shrink-0 text-[11px] text-muted-foreground animate-pulse">
            Saving…
          </span>
        )}
        {autosaveStatus === 'saved' && (
          <span className="shrink-0 text-[11px] text-green-600">Saved</span>
        )}
        {autosaveStatus === 'error' && (
          <span className="shrink-0 text-[11px] text-destructive">
            Save failed
          </span>
        )}
      </div>
      <div className="space-y-4">
        {/* Sender info */}
        {channel === 'email' ? (
          <SenderDrawer
            senderName={senderName}
            senderEmail={senderEmail}
            useDefaults={useDefaults}
            hasProvider={hasProvider}
            providerLoading={providerLoading}
            providerName={providerName}
            providerEmail={providerEmail}
            onChange={onSenderChange}
          />
        ) : null}
        {channel === 'sms' ? null : (
          <div>
            <label
              className="mb-2 block text-sm font-medium"
              htmlFor="channel-subject"
            >
              {labels.subject}
            </label>
            <SubjectEditor
              value={subject}
              onChange={onSubjectChange}
              variableDefinitions={allVariables}
            />
          </div>
        )}

        <div>
          <label
            className="mb-2 block text-sm font-medium"
            htmlFor="channel-body"
          >
            {labels.body}
          </label>
          {channel === 'email' ? (
            <MailyEmailEditor
              initialValue={editorInitialValue}
              onHtmlChange={handleHtmlChange}
              variableDefinitions={allVariables}
            />
          ) : (
            <Textarea
              id="channel-body"
              value={body}
              onChange={(event) => onBodyChange(event.target.value)}
              className="min-h-72 font-mono text-sm"
              placeholder={
                channel === 'sms'
                  ? 'Hi {{.name}}, your update is ready.'
                  : 'Hello {{.name}}'
              }
            />
          )}
        </div>
      </div>
    </div>
  );
};

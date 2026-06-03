'use client';

import dynamic from 'next/dynamic';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { WorkflowChannel } from '@/app/types/workflow';
import type { ReactEmailEditorHandle } from '../editors';

const ReactEmailEditor = dynamic(
  () => import('../editors/react-email-editor'),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[560px] items-center justify-center rounded-xl border border-border/50 text-sm text-muted-foreground">
        Loading email editor…
      </div>
    ),
  },
);

type ChannelEditorPanelProps = {
  channel: WorkflowChannel;
  subject: string;
  body: string;
  labels: { subject: string; body: string };
  editorRef: React.RefObject<ReactEmailEditorHandle | null>;
  onSubjectChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onEncodedBodyChange: (encodedBody: string) => void;
  onHtmlChange: (html: string) => void;
};

export const ChannelEditorPanel = ({
  channel,
  subject,
  body,
  labels,
  editorRef,
  onSubjectChange,
  onBodyChange,
  onEncodedBodyChange,
  onHtmlChange,
}: ChannelEditorPanelProps) => {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5">
      <div className="mb-4">
        <h6 className="font-medium text-foreground">Editor</h6>
        <p className="mt-1 text-sm text-muted-foreground">
          Update the template content for this workflow step.
        </p>
      </div>

      <div className="space-y-4">
        {channel !== 'sms' ? (
          <div>
            <label
              className="mb-2 block text-sm font-medium"
              htmlFor="channel-subject"
            >
              {labels.subject}
            </label>
            <Input
              id="channel-subject"
              value={subject}
              onChange={(event) => onSubjectChange(event.target.value)}
              placeholder={
                channel === 'push' ? 'Push title' : 'Welcome to Iwifunni'
              }
            />
          </div>
        ) : null}

        <div>
          <label
            className="mb-2 block text-sm font-medium"
            htmlFor="channel-body"
          >
            {labels.body}
          </label>
          {channel === 'email' ? (
            <ReactEmailEditor
              ref={editorRef}
              initialValue={body}
              onHtmlChange={onHtmlChange}
              onEncodedBodyChange={onEncodedBodyChange}
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

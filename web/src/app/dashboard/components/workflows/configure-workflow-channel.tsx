'use client';

import Link from 'next/link';
import { useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import CardBox from '@/app/components/shared/CardBox';
import { buildWorkflowBuilderHref } from './utils/urls';
import { channelConfigLabels, getNodeName } from './utils/display';
import { useChannelConfig } from './hooks/use-channel-config';
import { ChannelEditorPanel } from './components/channel-editor-panel';
import { ChannelPreviewPanel } from './components/channel-preview-panel';
import { Button } from '@/components/ui/button';
import type { ConfigureWorkflowChannelProps } from '@/app/dashboard/components/workflows/types/ui';
import type { ReactEmailEditorHandle } from './editors';

const ConfigureWorkflowChannel = ({
  workflowId,
  nodeId,
}: ConfigureWorkflowChannelProps) => {
  const router = useRouter();
  const emailEditorRef = useRef<ReactEmailEditorHandle | null>(null);

  const config = useChannelConfig(workflowId, nodeId, getNodeName);

  const labels = useMemo(
    () => channelConfigLabels[config.channel],
    [config.channel],
  );

  return (
    <CardBox className="p-6">
      {config.loading ? (
        <p className="text-sm text-muted-foreground">
          Loading channel editor...
        </p>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h5 className="card-title">Configure Channel</h5>
              <p className="mt-1 text-sm text-muted-foreground">
                {labels.hint}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {config.channel === 'email' &&
                config.autosaveStatus !== 'idle' && (
                  <span
                    className={`text-xs ${config.autosaveStatus === 'saved' ? 'text-muted-foreground' : config.autosaveStatus === 'saving' ? 'text-muted-foreground' : 'text-destructive'}`}
                  >
                    {config.autosaveStatus === 'saving'
                      ? 'Autosaving…'
                      : config.autosaveStatus === 'saved'
                        ? 'Autosaved'
                        : 'Autosave failed'}
                  </span>
                )}
              <Button asChild variant="outline">
                <Link href={buildWorkflowBuilderHref({ workflowId })}>
                  Back to builder
                </Link>
              </Button>
              <Button
                type="button"
                onClick={() => void config.saveChannelConfiguration()}
                disabled={config.saving}
                className="bg-primary text-primary-foreground hover:bg-primaryemphasis"
              >
                {config.saving ? 'Saving...' : 'Save channel'}
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card px-4 py-3">
            <p className="text-sm font-medium text-foreground">
              {config.workflow?.name || 'Workflow draft'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Step: {getNodeName(config.node, nodeId)} · ID:{' '}
              {config.node?.id || nodeId} · Channel: {config.channel}
            </p>
          </div>

          {config.error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {config.error}
            </p>
          ) : null}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
            <ChannelEditorPanel
              channel={config.channel}
              subject={config.subject}
              body={config.body}
              labels={labels}
              editorRef={emailEditorRef}
              onSubjectChange={config.setSubject}
              onBodyChange={config.setBody}
              onEncodedBodyChange={config.handleEncodedBodyChange}
              onHtmlChange={config.setEmailPreviewHtml}
            />

            <ChannelPreviewPanel
              channel={config.channel}
              subject={config.subject}
              body={config.body}
              emailPreviewHtml={config.emailPreviewHtml}
              labels={labels}
            />
          </div>
        </div>
      )}
    </CardBox>
  );
};

export default ConfigureWorkflowChannel;

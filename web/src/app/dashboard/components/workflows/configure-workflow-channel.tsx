'use client';

import { useMemo } from 'react';
import CardBox from '@/app/components/shared/CardBox';
import { channelConfigLabels } from './utils/display';
import { useChannelConfig } from './hooks/use-channel-config';
import { ChannelEditorPanel } from './components/channel-editor-panel';
import { ChannelPreviewPanel } from './components/channel-preview-panel';
import type { ConfigureWorkflowChannelProps } from '@/app/dashboard/components/workflows/types/ui';

const ConfigureWorkflowChannel = ({
  workflowId,
  nodeId,
}: ConfigureWorkflowChannelProps) => {
  const config = useChannelConfig(workflowId, nodeId);

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
          <div>
            <h5 className="card-title">Configure Channel</h5>
            <p className="mt-1 text-sm text-muted-foreground">{labels.hint}</p>
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
              onSubjectChange={config.setSubject}
              onBodyChange={config.setBody}
              onHtmlChange={config.handleHtmlChange}
            />

            <ChannelPreviewPanel
              channel={config.channel}
              subject={config.subject}
              body={config.body}
              labels={labels}
            />
          </div>
        </div>
      )}
    </CardBox>
  );
};

export default ConfigureWorkflowChannel;

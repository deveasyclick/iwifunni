'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CardBox from '@/components/card/CardBox';
import { channelConfigLabels } from '../utils/display';
import { useChannelConfig } from '../hooks/use-channel-config';
import { useDataPanel } from '../hooks/use-data-panel';
import { buildPreviewContext } from '../utils/preview-context';
import { useEmailProvider, useSmsProvider } from '@/features/settings/queries';
import { ChannelEditorPanel } from './ChannelEditorPanel';
import { ChannelPreviewPanel } from './ChannelPreviewPanel';
import { DataPanel } from './DataPanel';
import type { ConfigureWorkflowChannelProps } from '@/features/workflows/types/ui';
import { DEFAULT_SENDER_EMAIL, DEFAULT_SENDER_NAME } from '../constants';

const ConfigureWorkflowChannel = ({
  workflowId,
  nodeId,
}: ConfigureWorkflowChannelProps) => {
  const config = useChannelConfig(workflowId, nodeId);
  const dataPanel = useDataPanel(workflowId);
  const { provider: emailProviderConfig, loading: emailProviderLoading } =
    useEmailProvider();
  const { senderId: smsSenderId, hasProvider: smsHasProvider } =
    useSmsProvider();

  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [useDefaults, setUseDefaults] = useState(false);

  // Populate sender fields from email provider config once loaded
  const providerSetRef = useRef(false);
  useEffect(() => {
    if (emailProviderConfig && !providerSetRef.current) {
      providerSetRef.current = true;
      setSenderName(emailProviderConfig.config?.sender_name || '');
      setSenderEmail(emailProviderConfig.config?.from_email || '');
    }
  }, [emailProviderConfig]);

  // Compute effective sender display
  const displaySender = useMemo(() => {
    if (useDefaults && emailProviderConfig) {
      return {
        name: emailProviderConfig.config?.sender_name || DEFAULT_SENDER_NAME,
        email: emailProviderConfig.config?.from_email || DEFAULT_SENDER_EMAIL,
      };
    }
    return {
      name: senderName || DEFAULT_SENDER_NAME,
      email: senderEmail || DEFAULT_SENDER_EMAIL,
    };
  }, [useDefaults, emailProviderConfig, senderName, senderEmail]);

  const handleSenderChange = useCallback(
    (name: string, email: string, defaults: boolean) => {
      setSenderName(name);
      setSenderEmail(email);
      setUseDefaults(defaults);
    },
    [],
  );

  const labels = useMemo(
    () => channelConfigLabels[config.channel],
    [config.channel],
  );

  const previewContext = useMemo(
    () =>
      buildPreviewContext(
        dataPanel.previewSubscriber,
        config.workflow,
        config.payload,
      ),
    [dataPanel.previewSubscriber, config.workflow, config.payload],
  );

  const isEmail = config.channel === 'email';

  return (
    <div className="space-y-4">
      {/* Back button */}
      <button
        type="button"
        onClick={() => globalThis.history.back()}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to workflow
      </button>

      <CardBox className="p-6">
        {config.loading ? (
          <p className="text-sm text-muted-foreground">
            Loading channel editor...
          </p>
        ) : (
          <div className="space-y-6">
            {config.error ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {config.error}
              </p>
            ) : null}

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[300px_minmax(0,1.2fr)_minmax(360px,0.9fr)]">
              <div className="xl:overflow-auto xl:resize-x xl:min-w-50 xl:max-w-125">
                {isEmail || config.channel === 'sms' ? (
                  <DataPanel
                    workflowId={workflowId}
                    payload={config.payload}
                    onPayloadChange={config.setPayload}
                    previewSubscriber={dataPanel.previewSubscriber}
                    subscriberLoading={dataPanel.isLoading}
                    subscriberError={dataPanel.error}
                    onSelectSubscriber={dataPanel.selectPreviewSubscriber}
                    onResetSubscriber={dataPanel.resetToDefault}
                  />
                ) : null}
              </div>

              <ChannelEditorPanel
                channel={config.channel}
                subject={config.subject}
                body={config.body}
                payload={config.payload}
                labels={labels}
                senderName={senderName}
                senderEmail={senderEmail}
                useDefaults={useDefaults}
                hasProvider={!!emailProviderConfig}
                providerLoading={emailProviderLoading}
                providerName={emailProviderConfig?.config?.sender_name || ''}
                providerEmail={emailProviderConfig?.config?.from_email || ''}
                smsSenderId={smsSenderId}
                smsHasProvider={smsHasProvider}
                onSenderChange={handleSenderChange}
                onSubjectChange={config.setSubject}
                onBodyChange={config.setBody}
                onHtmlChange={config.handleHtmlChange}
                autosaveStatus={config.autosaveStatus}
              />

              <div className="xl:overflow-auto xl:resize-x xl:min-w-70 xl:max-w-150">
                <ChannelPreviewPanel
                  channel={config.channel}
                  subject={config.subject}
                  body={config.body}
                  contentJson={config.contentJson}
                  labels={labels}
                  previewContext={previewContext}
                  previewSubscriber={dataPanel.previewSubscriber}
                  senderName={displaySender.name}
                  senderEmail={displaySender.email}
                  smsSenderId={smsSenderId}
                />
              </div>
            </div>
          </div>
        )}
      </CardBox>
    </div>
  );
};

export default ConfigureWorkflowChannel;

'use client';

import CardBox from '@/components/card/CardBox';
import { Icon } from '@iconify/react';
import { useMemo } from 'react';
import { useProviders } from '../queries';
import { ConnectedProviderCard } from './components/ConnectedProviderCard';
import { DisconnectedProviderCard } from './components/DisconnectedProviderCard';
import { ProviderConnectDialog } from './components/ProviderConnectDialog';
import { CHANNEL_GROUPS, SUPPORTED_PROVIDERS } from './constants';
import { useProviderForm } from './hooks/use-provider-form';
import type { ProviderCard } from './types';

const ProviderManagement = () => {
  const providersQuery = useProviders();
  const form = useProviderForm();

  const providerCards = useMemo<ProviderCard[]>(() => {
    const items = providersQuery.data ?? [];
    return SUPPORTED_PROVIDERS.map((definition) => {
      const item = items.find((p) => p.name === definition.key) ?? null;
      const fallbackExists =
        items.filter(
          (p) =>
            p.channel === definition.channel &&
            p.is_active &&
            p.id !== item?.id,
        ).length > 0;
      return { definition, item, fallbackExists };
    });
  }, [providersQuery.data]);

  const connectedCount = providerCards.filter((c) => c.item).length;

  return (
    <>
      <CardBox className="p-6">
        <div className="flex flex-col gap-2 border-b border-border pb-5">
          <h5 className="card-title">Providers</h5>
          <p className="text-sm text-muted-foreground">
            Connect notification providers and control which one is primary for
            each channel.
          </p>
        </div>

        {form.error ? (
          <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {form.error}
          </p>
        ) : null}

        {providersQuery.isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Loading providers...
          </div>
        ) : (
          <>
            {connectedCount === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-2xl">
                  <Icon icon="mdi:connection" />
                </div>
                <p className="text-base font-semibold">
                  No providers connected yet.
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Connect a provider to start sending notifications.
                </p>
              </div>
            ) : null}

            <div className="mt-6 space-y-8">
              {CHANNEL_GROUPS.map(({ channel, label, icon }) => {
                const channelCards = providerCards.filter(
                  (c) => c.definition.channel === channel,
                );
                return (
                  <div key={channel}>
                    <div className="mb-3 flex items-center gap-2">
                      <Icon icon={icon} className="text-muted-foreground" />
                      <h6 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        {label}
                      </h6>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {channelCards.map(
                        ({ definition, item, fallbackExists }) =>
                          item ? (
                            <ConnectedProviderCard
                              key={definition.key}
                              definition={definition}
                              item={item}
                              fallbackExists={fallbackExists}
                              isMutating={Boolean(
                                form.mutatingKey?.endsWith(item.id),
                              )}
                              onEdit={form.openConnectDialog}
                              onStateChange={form.handleStateChange}
                            />
                          ) : (
                            <DisconnectedProviderCard
                              key={definition.key}
                              definition={definition}
                              onConnect={form.openConnectDialog}
                            />
                          ),
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardBox>

      <ProviderConnectDialog
        open={form.dialogOpen}
        onOpenChange={form.setDialogOpen}
        selectedProvider={form.selectedProvider}
        editingItem={form.editingItem}
        fieldValues={form.fieldValues}
        enabledToggle={form.enabledToggle}
        primaryToggle={form.primaryToggle}
        mutatingKey={form.mutatingKey}
        onFieldChange={form.updateFieldValue}
        onEnabledToggle={form.setEnabledToggle}
        onPrimaryToggle={form.setPrimaryToggle}
        onSubmit={form.submitProvider}
        onClose={form.closeDialog}
      />
    </>
  );
};

export default ProviderManagement;

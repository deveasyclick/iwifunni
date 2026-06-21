'use client';

import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Icon } from '@iconify/react';
import { CHANNEL_GROUPS } from '../constants/supported-providers';
import type { ProviderCard } from '../types';

type AvailableProvidersSheetProps = {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly unconnectedCards: ProviderCard[];
  readonly onConnect: (definition: ProviderCard['definition']) => void;
};

export const AvailableProvidersSheet = ({
  open,
  onOpenChange,
  unconnectedCards,
  onConnect,
}: AvailableProvidersSheetProps) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col border-border bg-card p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-border px-6 py-5">
          <SheetTitle className="text-foreground">
            Available Providers
          </SheetTitle>
          <SheetDescription className="text-muted-foreground">
            Connect a provider to start sending notifications.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {unconnectedCards.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-2xl text-muted-foreground">
                <Icon icon="mdi:check-circle-outline" />
              </div>
              <p className="text-sm font-medium text-foreground">
                All providers connected
              </p>
              <p className="text-xs text-muted-foreground">
                You've connected every available provider.
              </p>
            </div>
          ) : (
            CHANNEL_GROUPS.map(({ channel, label, icon }) => {
              const channelCards = unconnectedCards.filter(
                (c) => c.definition.channel === channel,
              );
              if (channelCards.length === 0) return null;

              return (
                <div key={channel} className="mb-6 last:mb-0">
                  <div className="mb-2 flex items-center gap-2">
                    <Icon
                      icon={icon}
                      className="text-sm text-muted-foreground"
                    />
                    <h6 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {label}
                    </h6>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {channelCards.length}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {channelCards.map(({ definition }) => {
                      const isDemo = definition.key.startsWith('demo-');

                      return (
                        <button
                          key={definition.key}
                          type="button"
                          onClick={() => {
                            onConnect(definition);
                            onOpenChange(false);
                          }}
                          className="flex w-full items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5 text-left transition-all duration-200 hover:border-primary/40 hover:bg-muted/30 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-card text-sm">
                            <Icon icon={definition.icon} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium text-foreground">
                                {definition.label}
                              </span>
                              {isDemo ? (
                                <Badge
                                  variant="lightPrimary"
                                  className="px-1.5 py-0 text-[10px]"
                                >
                                  Demo
                                </Badge>
                              ) : null}
                            </div>
                            <p className="truncate text-xs text-muted-foreground">
                              {definition.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

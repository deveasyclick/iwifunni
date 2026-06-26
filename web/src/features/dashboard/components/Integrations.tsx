'use client';

import Link from 'next/link';
import CardBox from '@/components/card/CardBox';
import { Icon } from '@iconify/react';
import { SUPPORTED_PROVIDERS } from '../../integrations/constants/supported-providers';

interface IntegrationsCardProps {
  readonly activeProviders?: Array<{
    name: string;
    channel: string;
  }>;
  readonly count?: number;
}

function providerIcon(name: string): string {
  const def = SUPPORTED_PROVIDERS.find((p) => p.key === name);
  return def?.icon ?? 'mdi:plug-socket-outline';
}

function providerLabel(name: string): string {
  const def = SUPPORTED_PROVIDERS.find((p) => p.key === name);
  return def?.label ?? name;
}

function providerCountLabel(count: number): string {
  return `${count} active provider${count !== 1 ? 's' : ''} connected`;
}

function renderProviderContent(
  hasData: boolean,
  hasProviders: boolean,
  activeProviders: IntegrationsCardProps['activeProviders'],
  count: number | undefined,
) {
  if (!hasData) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  if (!hasProviders) {
    return (
      <div className="flex flex-col items-center gap-2 py-2">
        <Icon
          icon="mdi:plug-socket-outline"
          className="h-8 w-8 text-muted-foreground/50"
        />
        <p className="text-sm text-muted-foreground">
          No providers connected yet
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        {activeProviders!.slice(0, 4).map((p) => (
          <div
            key={p.name}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background"
            title={providerLabel(p.name)}
          >
            <Icon icon={providerIcon(p.name)} className="h-5 w-5" />
          </div>
        ))}
        {count! > 4 && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/50 text-xs font-medium text-muted-foreground">
            +{count! - 4}
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        {providerCountLabel(count!)}
      </p>
    </div>
  );
}

const IntegrationsCard = ({
  activeProviders,
  count,
}: IntegrationsCardProps) => {
  const hasProviders = activeProviders != null && activeProviders.length > 0;

  return (
    <CardBox className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h5 className="card-title">Providers</h5>
        <Link
          href="/dashboard/integrations"
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          Manage
          <Icon icon="mdi:chevron-right" className="w-4 h-4" />
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-muted/30 p-4">
        {renderProviderContent(
          count !== undefined,
          hasProviders,
          activeProviders,
          count,
        )}
      </div>
    </CardBox>
  );
};

export default IntegrationsCard;

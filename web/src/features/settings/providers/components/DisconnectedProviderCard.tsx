'use client';

import { Icon } from '@iconify/react';
import type { ProviderDefinition } from '../types';

type DisconnectedProviderCardProps = {
  definition: ProviderDefinition;
  onConnect: (definition: ProviderDefinition) => void;
};

export const DisconnectedProviderCard = ({
  definition,
  onConnect,
}: DisconnectedProviderCardProps) => {
  const isDemo = definition.key.startsWith('demo-');

  return (
    <button
      type="button"
      onClick={() => onConnect(definition)}
      className="group relative flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-muted/10 px-4 py-5 text-center transition-all duration-200 hover:border-primary/40 hover:bg-muted/30 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background text-lg transition-transform duration-200 group-hover:scale-110">
        <Icon icon={definition.icon} />
      </div>
      <div>
        <div className="flex items-center justify-center gap-1.5">
          <p className="text-sm font-medium">{definition.label}</p>
          {isDemo ? (
            <span className="rounded-full bg-amber-100 px-1.5 py-0 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              Demo
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
          {definition.description}
        </p>
      </div>
      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <Icon icon="mdi:plus" className="text-[10px]" />
        Connect
      </span>
    </button>
  );
};

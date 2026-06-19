'use client';

import type {
  ProviderItem,
  UpdateProviderStatePayload,
} from '@/app/types/provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@iconify/react';
import type { ProviderDefinition } from '../types';

type ConnectedProviderCardProps = {
  readonly definition: ProviderDefinition;
  readonly item: ProviderItem;
  readonly fallbackExists: boolean;
  readonly isMutating: boolean;
  readonly onEdit: (definition: ProviderDefinition, item: ProviderItem) => void;
  readonly onStateChange: (
    item: ProviderItem,
    payload: UpdateProviderStatePayload,
  ) => void;
};

export const ConnectedProviderCard = ({
  definition,
  item,
  fallbackExists,
  isMutating,
  onEdit,
  onStateChange,
}: ConnectedProviderCardProps) => {
  const isPrimary = item.is_primary;
  const isActive = item.is_active;
  const isDemo = definition.key.startsWith('demo-');

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-4 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-base">
            <Icon icon={definition.icon} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold">{definition.label}</span>
              {isDemo ? (
                <span className="rounded-full bg-amber-100 px-1.5 py-0 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  Demo
                </span>
              ) : null}
              {isPrimary ? (
                <Badge
                  variant="lightPrimary"
                  className="text-[10px] px-1.5 py-0"
                >
                  Primary
                </Badge>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              {isActive ? 'Active' : 'Disabled'}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => onEdit(definition, item)}
        >
          Edit
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
        {!isPrimary && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={isMutating}
            onClick={() => onStateChange(item, { action: 'set_primary' })}
          >
            Set primary
          </Button>
        )}
        {isActive && !isPrimary ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground"
            disabled={isMutating}
            onClick={() => onStateChange(item, { action: 'disable' })}
          >
            Disable
          </Button>
        ) : null}
        {!isActive ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={isMutating}
            onClick={() => onStateChange(item, { action: 'enable' })}
          >
            Enable
          </Button>
        ) : null}
        {isPrimary && fallbackExists ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground"
            disabled={isMutating}
            onClick={() => onStateChange(item, { action: 'disable' })}
          >
            Disable
          </Button>
        ) : null}
      </div>

      {isPrimary && !fallbackExists ? (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Add another {item.channel} provider to disable this one.
        </p>
      ) : null}
    </div>
  );
};

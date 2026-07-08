'use client';

import type {
  ProviderItem,
  UpdateProviderStatePayload,
} from '@/app/types/provider';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@iconify/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
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
  readonly onDelete: (item: ProviderItem) => void;
};

export const ConnectedProviderCard = ({
  definition,
  item,
  fallbackExists,
  isMutating,
  onEdit,
  onStateChange,
  onDelete,
}: ConnectedProviderCardProps) => {
  const isPrimary = item.is_primary;
  const isActive = item.is_active;
  const isDemo = definition.key.startsWith('demo-');
  const canDisable = !isPrimary || (isPrimary && fallbackExists);

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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={isMutating}
            >
              <Icon icon="mdi:dots-vertical" className="text-base" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => onEdit(definition, item)}>
              <Icon icon="mdi:pencil-outline" className="mr-2 text-base" />
              Edit
            </DropdownMenuItem>

            {!isPrimary ? (
              <DropdownMenuItem
                onClick={() => onStateChange(item, { action: 'set_primary' })}
              >
                <Icon icon="mdi:star-outline" className="mr-2 text-base" />
                Set primary
              </DropdownMenuItem>
            ) : null}

            {canDisable && isActive ? (
              <DropdownMenuItem
                onClick={() => onStateChange(item, { action: 'disable' })}
              >
                <Icon
                  icon="mdi:power-off"
                  className="mr-2 text-base text-muted-foreground"
                />
                Disable
              </DropdownMenuItem>
            ) : null}

            {!isActive ? (
              <DropdownMenuItem
                onClick={() => onStateChange(item, { action: 'enable' })}
              >
                <Icon
                  icon="mdi:power-on"
                  className="mr-2 text-base text-muted-foreground"
                />
                Enable
              </DropdownMenuItem>
            ) : null}

            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(item)}
            >
              <Icon icon="mdi:link-variant-off" className="mr-2 text-base" />
              Disconnect
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isPrimary && !fallbackExists ? (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Add another {item.channel} provider to disable this one.
        </p>
      ) : null}

      {isDemo ? (
        <div className="mt-3 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          Sends to your own email address only.
        </div>
      ) : null}
    </div>
  );
};

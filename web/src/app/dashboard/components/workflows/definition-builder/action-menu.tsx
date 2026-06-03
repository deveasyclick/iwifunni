'use client';

import type { ReactNode } from 'react';
import { Clock3, Mail, MessageSquare, Smartphone } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { WorkflowNodeType } from '../types/draft';
import type { AddConnectedNodeOptions } from '../types/actions';
import type { WorkflowStepActionMenuProps } from '../types/ui';

const actionItems: Array<{
  label: string;
  type: WorkflowNodeType;
  channel?: AddConnectedNodeOptions['channel'];
  icon: typeof Clock3;
}> = [
  { label: 'Delay', type: 'delay', icon: Clock3 },
  { label: 'Email', type: 'notification', channel: 'email', icon: Mail },
  {
    label: 'SMS',
    type: 'notification',
    channel: 'sms',
    icon: MessageSquare,
  },
  {
    label: 'Push',
    type: 'notification',
    channel: 'push',
    icon: Smartphone,
  },
];

export const WorkflowStepActionMenu = ({
  children,
  open,
  onOpenChange,
  onSelect,
  align = 'center',
  side = 'bottom',
  sideOffset = 10,
}: WorkflowStepActionMenuProps) => {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align={align}
        side={side}
        sideOffset={sideOffset}
        className="w-[280px] rounded-3xl border border-border/20 bg-[color:color-mix(in_oklab,var(--dark)_92%,black)] p-3 text-white shadow-lg backdrop-blur"
      >
        <div className="space-y-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-bodytext">
            Insert next step
          </p>
          <div className="grid grid-cols-2 gap-2">
            {actionItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  className={cn(
                    'flex min-h-11 items-center gap-2 rounded-2xl border border-border/20 bg-lightprimary/10 px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-lightprimary/20',
                  )}
                  onClick={() => {
                    onSelect(
                      item.type,
                      item.channel ? { channel: item.channel } : undefined,
                    );
                    onOpenChange?.(false);
                  }}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-lightprimary text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

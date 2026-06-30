'use client';

import { Clock3, Mail, MessageSquare, Smartphone } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { WorkflowNodeType } from '../types/draft';
import type { AddConnectedNodeOptions } from '../types/actions';
import type { WorkflowStepActionMenuProps } from '../types/ui';

type ActionItem = {
  label: string;
  type: WorkflowNodeType;
  channel?: AddConnectedNodeOptions['channel'];
  icon: typeof Clock3;
};

const channelItems: ActionItem[] = [
  { label: 'Email', type: 'notification', channel: 'email', icon: Mail },
  { label: 'SMS', type: 'notification', channel: 'sms', icon: MessageSquare },
  { label: 'Push', type: 'notification', channel: 'push', icon: Smartphone },
];

const actionItems: ActionItem[] = [
  { label: 'Delay', type: 'delay', icon: Clock3 },
];

const renderActionList = (
  items: ActionItem[],
  onSelect: WorkflowStepActionMenuProps['onSelect'],
  onOpenChange: WorkflowStepActionMenuProps['onOpenChange'],
) => (
  <div className="flex flex-col gap-0.5">
    {items.map((item) => {
      const Icon = item.icon;
      return (
        <button
          key={item.label}
          type="button"
          className="flex min-h-11 items-center gap-2 rounded-2xl border border-border/20 bg-lightprimary/10 px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-lightprimary/20"
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
);

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
        className="w-[280px] rounded-3xl border border-border/20 bg-card p-3 text-foreground shadow-lg backdrop-blur"
      >
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
            Channels
          </p>
          {renderActionList(channelItems, onSelect, onOpenChange)}

          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
            Actions
          </p>
          {renderActionList(actionItems, onSelect, onOpenChange)}
        </div>
      </PopoverContent>
    </Popover>
  );
};

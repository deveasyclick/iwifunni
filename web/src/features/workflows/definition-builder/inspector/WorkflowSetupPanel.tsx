'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Bell,
  Check,
  Copy,
  ChevronRight,
  Info,
  Mail,
  MessageSquare,
} from 'lucide-react';
import { useState } from 'react';
import type { WorkflowSetupPanelProps } from '../../types/ui';
import { useWorkflowChannelToggles } from './hooks/use-workflow-channel-toggles';

function ChannelIcon({ channel }: { readonly channel: string }) {
  switch (channel) {
    case 'email':
      return <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />;
    case 'sms':
      return (
        <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
      );
    case 'push':
      return <Bell className="h-4 w-4 shrink-0 text-muted-foreground" />;
    default:
      return (
        <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
      );
  }
}

export const WorkflowSetupPanel = ({
  workflowSetup,
  autosaveState,
  onWorkflowSetupChange,
  issues,
  builderNodes,
}: WorkflowSetupPanelProps) => {
  const [copied, setCopied] = useState(false);

  const { channelToggles, selectedChannels, toggleChannel } =
    useWorkflowChannelToggles({ builderNodes, issues });

  const copyKey = async () => {
    if (!workflowSetup?.key) return;
    try {
      await navigator.clipboard.writeText(workflowSetup.key);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">
              {workflowSetup?.name || 'Workflow draft'}
            </p>
            <p className="text-xs text-muted-foreground">
              {workflowSetup?.key || 'No workflow key'}
            </p>
          </div>
          <Badge
            variant={
              autosaveState?.status === 'saved' ? 'lightSuccess' : 'secondary'
            }
          >
            {autosaveState?.message || 'No node selected'}
          </Badge>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Workflow name
            </label>
            <Input
              value={workflowSetup?.name || ''}
              onChange={(event) =>
                onWorkflowSetupChange?.({ name: event.target.value })
              }
              placeholder="Enter workflow name"
            />
          </div>

          <Collapsible className="group">
            <CollapsibleTrigger className="flex w-full items-center gap-2 text-sm font-medium text-foreground">
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
              Description
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <Textarea
                value={workflowSetup?.description || ''}
                onChange={(event) =>
                  onWorkflowSetupChange?.({ description: event.target.value })
                }
                placeholder="Describe what this workflow does"
                className="min-h-28"
              />
            </CollapsibleContent>
          </Collapsible>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Workflow key
            </label>
            <div className="flex items-center gap-2">
              <Input value={workflowSetup?.key || ''} readOnly />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => void copyKey()}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Channels — collapsible */}
      {channelToggles.length > 0 && (
        <Collapsible className="group rounded-xl border border-border px-4 py-4">
          <CollapsibleTrigger className="flex w-full items-center gap-2 text-sm font-medium text-foreground">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
            Channels
            <span className="ml-auto text-xs text-muted-foreground">
              {selectedChannels.length} active
            </span>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-2">
            {channelToggles.map((ct) => (
              <div
                key={ct.channel}
                className="flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <ChannelIcon channel={ct.channel} />
                  <Label
                    htmlFor={`wf-channel-${ct.channel}`}
                    className={`text-sm font-normal cursor-pointer ${
                      !ct.isValid ? 'text-muted-foreground' : ''
                    }`}
                  >
                    {ct.channel.charAt(0).toUpperCase() + ct.channel.slice(1)}
                  </Label>
                  {!ct.isValid && ct.reason && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Info className="h-3 w-3" />
                      {ct.reason}
                    </span>
                  )}
                </div>
                <Switch
                  id={`wf-channel-${ct.channel}`}
                  size="sm"
                  checked={selectedChannels.includes(ct.channel)}
                  disabled={!ct.isValid}
                  onCheckedChange={() => toggleChannel(ct.channel)}
                />
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};

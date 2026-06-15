'use client';

import type { WorkflowItem } from '@/app/types/workflow';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Icon } from '@iconify/react';
import { CHANNELS } from '../constants';
import type { Channel } from '../types/channels';

interface WorkflowPreferencesPanelProps {
  workflows: WorkflowItem[] | undefined;
  globalChannels: Channel[];
  workflowChannels: Record<string, Channel[]>;
  toggleWorkflow: (workflowId: string, channel: Channel) => void;
  toggleGlobal: (channel: Channel) => void;
}

export function WorkflowPreferencesPanel({
  workflows,
  globalChannels,
  workflowChannels,
  toggleWorkflow,
  toggleGlobal,
}: Readonly<WorkflowPreferencesPanelProps>) {
  return (
    <Accordion type="multiple" defaultValue={['global']}>
      <AccordionItem value="global">
        <AccordionTrigger className="font-semibold text-base">
          Global Preferences
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-3 rounded-md border p-4">
            {CHANNELS.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <Label
                  htmlFor={`global-${key}`}
                  className="font-normal cursor-pointer"
                >
                  {label}
                </Label>
                <Switch
                  id={`global-${key}`}
                  checked={globalChannels.includes(key)}
                  onCheckedChange={() => toggleGlobal(key)}
                />
              </div>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="workflows">
        <AccordionTrigger className="font-semibold text-base">
          Workflow Preferences
        </AccordionTrigger>
        <AccordionContent>
          {workflows && workflows.length > 0 ? (
            <div className="space-y-3">
              {workflows.map((wf) => (
                <div key={wf.id} className="rounded-md border p-4">
                  <p className="text-sm font-medium mb-2 truncate">{wf.name}</p>
                  <div className="space-y-2">
                    {CHANNELS.map(({ key, label }) => {
                      const globallyOff = !globalChannels.includes(key);
                      const isChecked = globallyOff
                        ? false
                        : (workflowChannels[wf.id] ?? globalChannels).includes(
                            key,
                          );
                      return (
                        <div
                          key={key}
                          className="flex items-center justify-between"
                        >
                          <Label
                            htmlFor={`wf-${wf.id}-${key}`}
                            className={`font-normal text-sm cursor-pointer ${
                              globallyOff ? 'text-muted-foreground' : ''
                            }`}
                          >
                            {label}
                          </Label>
                          <Switch
                            id={`wf-${wf.id}-${key}`}
                            size="sm"
                            checked={isChecked}
                            disabled={globallyOff}
                            onCheckedChange={() => toggleWorkflow(wf.id, key)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8 rounded-md border border-dashed">
              <div className="text-center text-muted-foreground">
                <Icon
                  icon="tabler:loader-2"
                  height={20}
                  className="mx-auto mb-2 animate-spin"
                />
                <p className="text-sm">Loading workflows...</p>
              </div>
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Icon } from '@iconify/react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { PhoneInput } from './PhoneInput';
import { DeleteSubscriberDialog } from './DeleteSubscriberDialog';
import { useSubscriberUpdate, useSubscriberDelete } from '../queries';
import { workflowApi } from '@/features/workflows/api';
import type { SubscriberType } from '@/app/types/subscriber';

type Channel = 'email' | 'sms' | 'push';

const CHANNELS: { key: Channel; label: string }[] = [
  { key: 'email', label: 'Email' },
  { key: 'sms', label: 'SMS' },
  { key: 'push', label: 'Push' },
];

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface Preferences extends Record<string, unknown> {
  global?: { channels?: Channel[] };
  workflows?: Record<string, { channels?: Channel[] }>;
}

interface EditSubscriberSheetProps {
  subscriber: SubscriberType | null;
  open: boolean;
  onClose: () => void;
}

export function EditSubscriberSheet({
  subscriber,
  open,
  onClose,
}: EditSubscriberSheetProps) {
  const updateMutation = useSubscriberUpdate();
  const deleteMutation = useSubscriberDelete();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Fetch workflows for the workflow preferences section
  const { data: workflows } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => workflowApi.getWorkflows(),
    enabled: open,
  });

  // Preferences state
  const prefs = (subscriber?.preferences ?? {}) as Preferences;
  const [globalChannels, setGlobalChannels] = useState<Channel[]>(
    (prefs.global?.channels as Channel[]) ?? ['email', 'sms', 'push'],
  );
  const [workflowChannels, setWorkflowChannels] = useState<
    Record<string, Channel[]>
  >(() => {
    const wf: Record<string, Channel[]> = {};
    if (prefs.workflows) {
      for (const [id, val] of Object.entries(prefs.workflows)) {
        wf[id] = (val.channels as Channel[]) ?? [];
      }
    }
    return wf;
  });

  // Reset preferences when subscriber changes
  useEffect(() => {
    const p = (subscriber?.preferences ?? {}) as Preferences;
    setGlobalChannels(
      (p.global?.channels as Channel[]) ?? ['email', 'sms', 'push'],
    );
    const wf: Record<string, Channel[]> = {};
    if (p.workflows) {
      for (const [id, val] of Object.entries(p.workflows)) {
        wf[id] = (val.channels as Channel[]) ?? [];
      }
    }
    setWorkflowChannels(wf);
    setUpdateError(null);
  }, [subscriber]);

  // Overview form
  const form = useForm({
    defaultValues: {
      name: subscriber?.name ?? '',
      email: subscriber?.email ?? '',
      phone: subscriber?.phone ?? '',
      metadata: subscriber?.metadata
        ? JSON.stringify(subscriber.metadata, null, 2)
        : '',
    },
  });

  // Sync form when subscriber changes
  useEffect(() => {
    form.reset({
      name: subscriber?.name ?? '',
      email: subscriber?.email ?? '',
      phone: subscriber?.phone ?? '',
      metadata: subscriber?.metadata
        ? JSON.stringify(subscriber.metadata, null, 2)
        : '',
    });
  }, [subscriber, form]);

  const toggleGlobal = (channel: Channel) => {
    setGlobalChannels((prev) =>
      prev.includes(channel)
        ? prev.filter((c) => c !== channel)
        : [...prev, channel],
    );
  };

  const toggleWorkflow = (workflowId: string, channel: Channel) => {
    setWorkflowChannels((prev) => {
      const current = prev[workflowId] ?? [];
      const updated = current.includes(channel)
        ? current.filter((c) => c !== channel)
        : [...current, channel];
      return { ...prev, [workflowId]: updated };
    });
  };

  const handleSave = () => {
    const values = form.getValues();

    let metadata: Record<string, unknown> | undefined;
    if (values.metadata && values.metadata.trim() !== '') {
      try {
        metadata = JSON.parse(values.metadata) as Record<string, unknown>;
      } catch {
        setUpdateError('Invalid JSON in metadata field');
        return;
      }
    }

    if (!subscriber) return;
    setUpdateError(null);

    // Build preferences object - only include workflows that have overrides
    const wfPrefs: Record<string, { channels: Channel[] }> = {};
    for (const [id, channels] of Object.entries(workflowChannels)) {
      const allChannels = CHANNELS.map((c) => c.key);
      // Only store if it differs from the global defaults
      const isSame =
        channels.length === globalChannels.length &&
        channels.every((c) => globalChannels.includes(c));
      if (!isSame) {
        wfPrefs[id] = { channels };
      }
    }

    const preferences: Record<string, unknown> = {
      global: { channels: globalChannels },
      ...(Object.keys(wfPrefs).length > 0 ? { workflows: wfPrefs } : {}),
    };

    updateMutation.mutate(
      {
        id: subscriber.id,
        payload: {
          name: values.name,
          email: values.email || undefined,
          phone: values.phone || undefined,
          tags: [],
          metadata,
          preferences,
        },
      },
      {
        onSuccess: () => {
          onClose();
        },
        onError: (err) => {
          setUpdateError(err.message || 'Failed to update subscriber');
        },
      },
    );
  };

  const handleDeleteConfirm = () => {
    if (!subscriber) return;
    deleteMutation.mutate(subscriber.id, {
      onSettled: () => {
        setShowDeleteDialog(false);
        onClose();
      },
    });
  };

  const globalDisabled = CHANNELS.map((c) => !globalChannels.includes(c.key));

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg overflow-y-auto"
        >
          <SheetHeader className="mb-6">
            <SheetTitle>Edit Subscriber</SheetTitle>
            <SheetDescription>
              Update subscriber details and notification preferences.
            </SheetDescription>
          </SheetHeader>

          {updateError && (
            <div className="mb-4 p-3 rounded-md bg-lighterror text-error text-sm">
              {updateError}
            </div>
          )}

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="preferences">Preferences</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-0">
              {/* Subscriber ID */}
              <div className="mb-4">
                <Label className="text-sm text-muted-foreground">ID</Label>
                <p className="font-mono text-sm mt-0.5">{subscriber?.id}</p>
              </div>

              <Form {...form}>
                <div className="space-y-4">
                  <FormField
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Subscriber name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="subscriber@example.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <PhoneInput
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="(555) 000-0000"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    name="metadata"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Metadata (JSON)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder='{"key": "value"}'
                            className="min-h-[80px] font-mono text-sm"
                            {...field}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </Form>
            </TabsContent>

            <TabsContent value="preferences" className="mt-0">
              <p className="text-sm text-muted-foreground mb-4">
                Control which channels this subscriber receives notifications on.
                Global toggles act as the master switch — turning a channel off
                globally disables it for all workflows.
              </p>
              <Accordion type="multiple" defaultValue={['global']}>
                <AccordionItem value="global">
                  <AccordionTrigger className="font-semibold text-base">
                    Global Preferences
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 rounded-md border p-4">
                      {CHANNELS.map(({ key, label }) => (
                        <div
                          key={key}
                          className="flex items-center justify-between"
                        >
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
                          <div
                            key={wf.id}
                            className="rounded-md border p-4"
                          >
                            <p className="text-sm font-medium mb-2 truncate">
                              {wf.name}
                            </p>
                            <div className="space-y-2">
                              {CHANNELS.map(({ key, label }) => {
                                const globallyOff = !globalChannels.includes(key);
                                const isChecked = globallyOff
                                  ? false
                                  : (workflowChannels[wf.id] ?? globalChannels).includes(key);
                                return (
                                  <div
                                    key={key}
                                    className="flex items-center justify-between"
                                  >
                                    <Label
                                      htmlFor={`wf-${wf.id}-${key}`}
                                      className={`font-normal text-sm cursor-pointer ${
                                        globallyOff
                                          ? 'text-muted-foreground'
                                          : ''
                                      }`}
                                    >
                                      {label}
                                    </Label>
                                    <Switch
                                      id={`wf-${wf.id}-${key}`}
                                      size="sm"
                                      checked={isChecked}
                                      disabled={globallyOff}
                                      onCheckedChange={() =>
                                        toggleWorkflow(wf.id, key)
                                      }
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
            </TabsContent>
          </Tabs>

          {/* Footer Actions */}
          <div className="sticky bottom-0 bg-card pt-4 border-t flex items-center gap-3">
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="rounded-md flex-1"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              className="rounded-md"
            >
              Cancel
            </Button>
            <Button
              onClick={() => setShowDeleteDialog(true)}
              variant="destructive"
              className="rounded-md"
            >
              Delete
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <DeleteSubscriberDialog
        open={showDeleteDialog}
        deletingItem={subscriber}
        isDeleting={deleteMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </>
  );
}

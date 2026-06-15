'use client';

import type { SubscriberType } from '@/app/types/subscriber';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useWorkflowListQuery } from '@/features/workflows/queries';
import { useState } from 'react';
import { useSubscriberEditForm } from '../hooks/use-subscriber-edit-form';
import { useSubscriberPreferences } from '../hooks/use-subscriber-preferences';
import { useSubscriberDelete, useSubscriberUpdate } from '../queries';
import { DeleteSubscriberDialog } from './DeleteSubscriberDialog';
import { PhoneInput } from './PhoneInput';
import { WorkflowPreferencesPanel } from './WorkflowPreferencesPanel';

interface EditSubscriberSheetProps {
  subscriber: SubscriberType | null;
  open: boolean;
  onClose: () => void;
}

export function EditSubscriberSheet({
  subscriber,
  open,
  onClose,
}: Readonly<EditSubscriberSheetProps>) {
  const updateMutation = useSubscriberUpdate();
  const deleteMutation = useSubscriberDelete();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Fetch workflows for the workflow preferences section
  const { data: workflows } = useWorkflowListQuery();

  // Preferences state management
  const {
    globalChannels,
    workflowChannels,
    toggleGlobal,
    toggleWorkflow,
    buildPreferencesPayload,
  } = useSubscriberPreferences(subscriber);

  // Overview form — handles validation, metadata parsing, and save
  const { form, handleSave } = useSubscriberEditForm({
    subscriber: subscriber ?? undefined,
    isPending: updateMutation.isPending,
    onError: setUpdateError,
    buildPreferencesPayload,
    onSave: (payload) => {
      updateMutation.mutate(payload, {
        onSuccess: () => onClose(),
        onError: (err) =>
          setUpdateError(err.message || 'Failed to update subscriber'),
      });
    },
  });

  const handleDeleteConfirm = () => {
    if (!subscriber) return;
    deleteMutation.mutate(subscriber.id, {
      onSettled: () => {
        setShowDeleteDialog(false);
        onClose();
      },
    });
  };

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
                            className="min-h-20 font-mono text-sm"
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
                Control which channels this subscriber receives notifications
                on. Global toggles act as the master switch — turning a channel
                off globally disables it for all workflows.
              </p>
              <WorkflowPreferencesPanel
                workflows={workflows}
                globalChannels={globalChannels}
                workflowChannels={workflowChannels}
                toggleGlobal={toggleGlobal}
                toggleWorkflow={toggleWorkflow}
              />
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
            <Button onClick={onClose} variant="outline" className="rounded-md">
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

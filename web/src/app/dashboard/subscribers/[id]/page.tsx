'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import CardBox from '@/components/card/CardBox';
import BreadcrumbComp from '@/app/dashboard/layout/shared/breadcrumb/BreadcrumbComp';
import {
  useSubscriberDetail,
  useSubscriberUpdate,
  useSubscriberDelete,
} from '@/features/subscribers/queries';
import { DeleteSubscriberDialog } from '@/features/subscribers/components/DeleteSubscriberDialog';
import { SubscriberMetadata } from '@/features/subscribers/components/SubscriberMetadata';
import { SubscriberChannelsSection } from '@/features/subscribers/components/SubscriberChannelsSection';
import { useSubscriberEditForm } from '@/features/subscribers/hooks/use-subscriber-edit-form';

export default function SubscriberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const subscriberId = params.id as string;

  const {
    data: subscriber,
    isLoading,
    isError,
  } = useSubscriberDetail(subscriberId);
  const updateMutation = useSubscriberUpdate();
  const deleteMutation = useSubscriberDelete();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const form = useSubscriberEditForm({
    subscriber: subscriber!,
    onUpdate: (payload) =>
      updateMutation.mutate(payload, {
        onSuccess: () => {
          form.setEditing(false);
          setUpdateError(null);
        },
        onError: (err) =>
          setUpdateError(err.message || 'Failed to update subscriber'),
      }),
    isPending: updateMutation.isPending,
    onError: setUpdateError,
  });

  const handleDeleteConfirm = () => {
    deleteMutation.mutate(subscriberId, {
      onSettled: () => {
        setShowDeleteDialog(false);
        router.push('/dashboard/subscribers');
      },
    });
  };

  const BCrumb = [
    { to: '/', title: 'Home' },
    { to: '/dashboard/subscribers', title: 'Subscribers' },
    { title: subscriber?.name || subscriber?.email || 'Subscriber' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (isError || !subscriber) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-error">Subscriber not found</div>
      </div>
    );
  }

  return (
    <>
      <BreadcrumbComp
        title={`Subscriber: ${subscriber.email || subscriber.name}`}
        items={BCrumb}
      />

      <CardBox>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">Subscriber Details</h2>
          <div className="flex gap-2">
            {!form.editing && (
              <>
                <Button
                  onClick={() => form.setEditing(true)}
                  className="rounded-md"
                >
                  Edit
                </Button>
                <Button
                  onClick={() => setShowDeleteDialog(true)}
                  variant="destructive"
                  className="rounded-md"
                >
                  Delete
                </Button>
              </>
            )}
            {form.editing && (
              <>
                <Button
                  onClick={form.handleUpdate}
                  disabled={updateMutation.isPending}
                  className="rounded-md"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  onClick={() => form.setEditing(false)}
                  variant="outline"
                  className="rounded-md"
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>

        {updateError && (
          <div className="mb-4 p-3 rounded-md bg-lighterror text-error text-sm">
            {updateError}
          </div>
        )}

        <SubscriberMetadata
          subscriberId={subscriberId}
          subscriptionDate={subscriber.subscriptionDate}
          lastNotificationDate={subscriber.lastNotificationDate}
        />

        <Form {...form.form}>
          <div className="bg-background p-6 rounded-md">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Subscriber name"
                        disabled={!form.editing}
                        className="w-full"
                        {...field}
                      />
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
                        disabled={!form.editing}
                        className="w-full"
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
                      <Input
                        type="tel"
                        placeholder="+1 (555) 000-0000"
                        disabled={!form.editing}
                        className="w-full"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <FormLabel className="mb-2 block">Email Status</FormLabel>
                <div className="flex items-center h-10 px-3 border border-input rounded-md bg-background">
                  {form.editing ? (
                    <select
                      aria-label="email status"
                      value={form.status}
                      onChange={(e) =>
                        form.setStatus(e.target.value as typeof form.status)
                      }
                      className="w-full outline-none bg-transparent"
                    >
                      <option value="subscribed">Subscribed</option>
                      <option value="unsubscribed">Unsubscribed</option>
                      <option value="bounced">Bounced</option>
                    </select>
                  ) : (
                    <span className="capitalize">{form.status}</span>
                  )}
                </div>
              </div>
            </div>

            <SubscriberChannelsSection
              channels={form.channels}
              editing={form.editing}
              onChannelChange={form.handleChannelChange}
            />

            <div className="mt-6">
              <FormField
                name="metadata"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Metadata (JSON)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='{"key": "value", "preferences": {...}}'
                        className="w-full bg-background min-h-[100px] font-mono text-sm"
                        disabled={!form.editing}
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </Form>
      </CardBox>

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

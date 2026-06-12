'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { subscriberFormSchema, type SubscriberFormValues } from '../schema';
import type {
  SubscriberType,
  CreateSubscriberPayload,
} from '@/app/types/subscriber';

type Channel = 'email' | 'sms' | 'push';
type SubscriberStatus = 'subscribed' | 'unsubscribed' | 'bounced';

type UseSubscriberEditFormOptions = {
  subscriber: SubscriberType;
  onUpdate: (payload: { id: string; payload: CreateSubscriberPayload }) => void;
  isPending: boolean;
  onError: (message: string | null) => void;
};

export function useSubscriberEditForm({
  subscriber,
  onUpdate,
  isPending,
  onError,
}: UseSubscriberEditFormOptions) {
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<SubscriberStatus>(
    subscriber.status.email || 'subscribed',
  );

  const form = useForm<SubscriberFormValues>({
    resolver: zodResolver(subscriberFormSchema),
    defaultValues: {
      name: subscriber.name,
      email: subscriber.email || '',
      phone: subscriber.phone || '',
      channels: subscriber.channels,
      metadata: subscriber.metadata
        ? JSON.stringify(subscriber.metadata, null, 2)
        : '',
    },
  });

  const channels = form.watch('channels');

  const handleChannelChange = (channel: Channel, checked: boolean) => {
    const current = form.getValues('channels');
    const updated = checked
      ? current.includes(channel)
        ? current
        : [...current, channel]
      : current.filter((c) => c !== channel);
    form.setValue('channels', updated, { shouldValidate: true });
  };

  const handleUpdate = () => {
    const values = form.getValues();
    const result = subscriberFormSchema.safeParse(values);
    if (!result.success) {
      onError(result.error.issues[0]?.message || 'Validation failed');
      return;
    }

    let metadata: Record<string, unknown> | undefined;
    if (result.data.metadata && result.data.metadata.trim() !== '') {
      try {
        metadata = JSON.parse(result.data.metadata) as Record<string, unknown>;
      } catch {
        // invalid JSON, schema already validated
      }
    }

    onError(null);
    onUpdate({
      id: subscriber.id,
      payload: {
        name: result.data.name,
        email: result.data.email || undefined,
        phone: result.data.phone || undefined,
        channels: result.data.channels,
        status: {
          email: status,
          sms: result.data.channels.includes('sms') ? status : undefined,
          push: result.data.channels.includes('push') ? status : undefined,
        },
        tags: [],
        metadata,
      },
    });
  };

  const resetForm = () => {
    form.reset();
    setStatus(subscriber.status.email || 'subscribed');
  };

  return {
    editing,
    setEditing: (v: boolean) => {
      if (!v) resetForm();
      setEditing(v);
    },
    form,
    channels,
    handleChannelChange,
    handleUpdate,
    resetForm,
    isPending,
    status,
    setStatus,
  };
}

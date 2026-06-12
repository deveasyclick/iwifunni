'use client';

import { type FormEventHandler } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { subscriberFormSchema, type SubscriberFormValues } from '../schema';
import { useSubscriberCreate } from '../queries';

interface UseCreateSubscriberFormOptions {
  onCreated?: () => void;
  onCancel?: () => void;
}

export function useCreateSubscriberForm({
  onCreated,
  onCancel,
}: UseCreateSubscriberFormOptions) {
  const form = useForm<SubscriberFormValues>({
    resolver: zodResolver(subscriberFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      channels: ['email', 'sms', 'push'],
      metadata: undefined,
    },
  });

  const createMutation = useSubscriberCreate();
  const channels = form.watch('channels');

  const submitHandler: SubmitHandler<SubscriberFormValues> = (data) => {
    let metadata: Record<string, unknown> | undefined;
    if (data.metadata && data.metadata.trim() !== '') {
      try {
        metadata = JSON.parse(data.metadata) as Record<string, unknown>;
      } catch {
        // invalid JSON, schema already validated
      }
    }

    createMutation.mutate(
      {
        name: data.name,
        email: data.email || undefined,
        phone: data.phone || undefined,
        channels: data.channels,
        status: {
          email: 'subscribed',
          sms: data.channels.includes('sms') ? 'subscribed' : undefined,
          push: data.channels.includes('push') ? 'subscribed' : undefined,
        },
        tags: [],
        metadata,
      },
      {
        onSuccess: () => {
          form.reset();
          onCreated?.();
        },
        onError: (error) => {
          console.error('Failed to create subscriber', error);
        },
      },
    );
  };

  const onSubmit: FormEventHandler<HTMLFormElement> = (e) => {
    form
      .handleSubmit(submitHandler)(e)
      .catch((err) => console.error(err));
  };

  return {
    form,
    channels,
    onSubmit,
    onCancel,
    isPending: createMutation.isPending,
    isError: createMutation.isError,
    error: createMutation.error,
  };
}

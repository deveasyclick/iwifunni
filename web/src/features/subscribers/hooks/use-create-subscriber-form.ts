'use client';

import { useState, type FormEventHandler } from 'react';
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
  const [tagInput, setTagInput] = useState('');

  const form = useForm<SubscriberFormValues>({
    resolver: zodResolver(subscriberFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      pushToken: '',
      channels: ['email', 'sms', 'push'],
      tags: [],
    },
  });

  const createMutation = useSubscriberCreate();
  const channels = form.watch('channels');

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (!trimmed) return;

    const currentTags = form.getValues('tags');
    if (!currentTags.includes(trimmed)) {
      form.setValue('tags', [...currentTags, trimmed], {
        shouldValidate: true,
      });
    }
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    const currentTags = form.getValues('tags');
    form.setValue(
      'tags',
      currentTags.filter((t) => t !== tag),
      { shouldValidate: true },
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const submitHandler: SubmitHandler<SubscriberFormValues> = (data) => {
    createMutation.mutate(
      {
        name: data.name,
        email: data.email || undefined,
        phone: data.phone || undefined,
        pushToken: data.pushToken || undefined,
        channels: data.channels,
        status: {
          email: 'subscribed',
          sms: data.channels.includes('sms') ? 'subscribed' : undefined,
          push: data.channels.includes('push') ? 'subscribed' : undefined,
        },
        tags: data.tags,
      },
      {
        onSuccess: () => {
          form.reset();
          setTagInput('');
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
    tagInput,
    setTagInput,
    handleAddTag,
    handleRemoveTag,
    handleKeyDown,
    onSubmit,
    onCancel,
    isPending: createMutation.isPending,
    isError: createMutation.isError,
    error: createMutation.error,
  };
}

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { subscriberFormSchema, type SubscriberFormValues } from '../schema';
import type {
  SubscriberType,
  CreateSubscriberPayload,
} from '@/app/types/subscriber';

type UseSubscriberEditFormOptions = {
  subscriber?: SubscriberType;
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

  const form = useForm<SubscriberFormValues>({
    resolver: zodResolver(subscriberFormSchema),
    defaultValues: {
      name: subscriber?.name || '',
      email: subscriber?.email || '',
      phone: subscriber?.phone || '',
      metadata: subscriber?.metadata
        ? JSON.stringify(subscriber.metadata, null, 2)
        : '',
    },
  });

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

    if (!subscriber) return;
    onError(null);
    onUpdate({
      id: subscriber.id,
      payload: {
        name: result.data.name,
        email: result.data.email || undefined,
        phone: result.data.phone || undefined,
        tags: [],
        metadata,
      },
    });
  };

  const resetForm = () => {
    form.reset();
  };

  return {
    editing,
    setEditing: (v: boolean) => {
      if (!v) resetForm();
      setEditing(v);
    },
    form,
    handleUpdate,
    resetForm,
    isPending,
  };
}

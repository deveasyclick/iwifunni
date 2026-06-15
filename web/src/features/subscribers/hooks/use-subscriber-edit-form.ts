'use client';

import type { SubscriberType } from '@/app/types/subscriber';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { subscriberFormSchema, type SubscriberFormValues } from '../schema';
import type { BuildPreferencesPayloadResult } from './use-subscriber-preferences';

type SavePayload = {
  id: string;
  payload: {
    name: string;
    email?: string;
    phone?: string;
    tags: string[];
    metadata?: Record<string, unknown>;
    preferences?: Record<string, unknown>;
  };
};

type UseSubscriberEditFormOptions = {
  subscriber?: SubscriberType;
  isPending: boolean;
  onError: (message: string | null) => void;
  buildPreferencesPayload?: () => BuildPreferencesPayloadResult;
  onSave: (payload: SavePayload) => void;
};

export function useSubscriberEditForm({
  subscriber,
  isPending,
  onError,
  buildPreferencesPayload,
  onSave,
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

  const handleSave = () => {
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
        onError('Invalid JSON in metadata field');
        return;
      }
    }

    if (!subscriber) return;
    onError(null);

    const preferences = buildPreferencesPayload
      ? (buildPreferencesPayload() as Record<string, unknown>)
      : undefined;

    onSave({
      id: subscriber.id,
      payload: {
        name: result.data.name,
        email: result.data.email || undefined,
        phone: result.data.phone || undefined,
        tags: [],
        metadata,
        preferences,
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
    handleSave,
    resetForm,
    isPending,
  };
}

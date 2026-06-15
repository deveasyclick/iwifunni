'use client';

import type {
  CreateProviderPayload,
  ProviderItem,
  UpdateProviderStatePayload,
} from '@/app/types/provider';
import { type FormEvent, useCallback, useState } from 'react';
import {
  useCreateProvider,
  useUpdateProvider,
  useUpdateProviderState,
} from '../../queries';
import type { ProviderDefinition } from '../types';

export function useProviderForm() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] =
    useState<ProviderDefinition | null>(null);
  const [editingItem, setEditingItem] = useState<ProviderItem | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [enabledToggle, setEnabledToggle] = useState(true);
  const [primaryToggle, setPrimaryToggle] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mutatingKey, setMutatingKey] = useState<string | null>(null);

  const createProvider = useCreateProvider();
  const updateProvider = useUpdateProvider();
  const updateState = useUpdateProviderState();

  const openConnectDialog = useCallback(
    (definition: ProviderDefinition, item?: ProviderItem) => {
      const values: Record<string, string> = {};
      for (const field of definition.credentials) values[field.key] = '';
      for (const field of definition.config) {
        const configValues = item?.config ?? {};
        const v = configValues[field.sourceKey ?? field.key];
        values[field.key] =
          typeof v === 'string' || typeof v === 'number' ? String(v) : '';
      }
      setEnabledToggle(item ? item.is_active : true);
      setPrimaryToggle(item ? item.is_primary : false);
      setSelectedProvider(definition);
      setEditingItem(item ?? null);
      setFieldValues(values);
      setError(null);
      setMutatingKey(null);
      setDialogOpen(true);
    },
    [],
  );

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    setSelectedProvider(null);
    setEditingItem(null);
    setFieldValues({});
    setError(null);
    setMutatingKey(null);
  }, []);

  const updateFieldValue = useCallback((key: string, value: string) => {
    setFieldValues((cur) => ({ ...cur, [key]: value }));
  }, []);

  const buildPayload = useCallback(
    (definition: ProviderDefinition): CreateProviderPayload => {
      const credentials: Record<string, unknown> = {};
      const config: Record<string, unknown> = {};
      for (const field of definition.credentials) {
        const v = fieldValues[field.key]?.trim();
        if (v) credentials[field.key] = v;
      }
      for (const field of definition.config) {
        const v = fieldValues[field.key]?.trim();
        if (!v) continue;
        config[field.key] = field.type === 'number' ? Number(v) : v;
      }
      return {
        name: definition.key,
        channel: definition.channel,
        credentials,
        config,
      };
    },
    [fieldValues],
  );

  const submitProvider = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!selectedProvider) return;
      setError(null);
      setMutatingKey(`save:${selectedProvider.key}`);
      try {
        const payload = buildPayload(selectedProvider);
        let saved: ProviderItem;
        if (editingItem) {
          saved = await updateProvider.mutateAsync({
            id: editingItem.id,
            payload,
          });
        } else {
          saved = await createProvider.mutateAsync(payload);
        }

        if (primaryToggle) {
          await updateState.mutateAsync({
            id: saved.id,
            payload: { action: 'set_primary' },
          });
        } else if (!enabledToggle) {
          await updateState.mutateAsync({
            id: saved.id,
            payload: { action: 'disable' },
          });
        }

        closeDialog();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to save provider connection',
        );
      } finally {
        setMutatingKey(null);
      }
    },
    [
      selectedProvider,
      editingItem,
      buildPayload,
      primaryToggle,
      enabledToggle,
      createProvider,
      updateProvider,
      updateState,
      closeDialog,
    ],
  );

  const handleStateChange = useCallback(
    async (item: ProviderItem, payload: UpdateProviderStatePayload) => {
      setError(null);
      setMutatingKey(`${payload.action}:${item.id}`);
      try {
        await updateState.mutateAsync({ id: item.id, payload });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to update provider',
        );
      } finally {
        setMutatingKey(null);
      }
    },
    [updateState],
  );

  return {
    dialogOpen,
    setDialogOpen,
    selectedProvider,
    editingItem,
    fieldValues,
    enabledToggle,
    primaryToggle,
    error,
    mutatingKey,
    openConnectDialog,
    closeDialog,
    updateFieldValue,
    setEnabledToggle,
    setPrimaryToggle,
    submitProvider,
    handleStateChange,
  };
}

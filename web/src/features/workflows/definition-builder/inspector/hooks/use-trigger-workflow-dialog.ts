'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useUserProfile } from '@/features/auth/queries';
import { useSubscriberSearchInput } from '@/features/workflows/configure/hooks/use-subscriber-search-input';
import { useWorkflowTrigger, useNotificationPollQuery } from '../../../queries';
import type { PreviewSubscriber } from '@/features/workflows/types/data-panel';

interface UseTriggerWorkflowDialogOptions {
  readonly workflowId: string;
  readonly selectedChannels: string[];
  readonly hasChannelToggles?: boolean;
}

interface UseTriggerWorkflowDialogReturn {
  open: boolean;
  setOpen: (open: boolean) => void;
  selectedSubscriber: PreviewSubscriber | null;
  setSelectedSubscriber: (subscriber: PreviewSubscriber | null) => void;
  payloadObj: Record<string, unknown>;
  setPayloadObj: (payload: Record<string, unknown>) => void;
  notificationId: string | null;
  setNotificationId: (id: string | null) => void;
  resetNotificationId: () => void;
  isTriggering: boolean;
  isPolling: boolean;
  isDone: boolean;
  events: Array<{
    id: string;
    channel: string;
    destination: string;
    status: string;
    error_message?: string;
    provider_message_id?: string;
  }>;
  hasError: boolean;
  triggerError: string | undefined;
  isValid: boolean;
  handleTrigger: () => Promise<void>;
  handleSelectSubscriber: (subscriber: PreviewSubscriber) => void;
  handleOpenChange: (newOpen: boolean) => void;
  handleClearSubscriber: () => void;
  subscriberSearch: ReturnType<typeof useSubscriberSearchInput>;
  userEmail: string | undefined;
  triggerMutation: ReturnType<typeof useWorkflowTrigger>;
}

export function useTriggerWorkflowDialog({
  workflowId,
  selectedChannels,
  hasChannelToggles = false,
}: UseTriggerWorkflowDialogOptions): UseTriggerWorkflowDialogReturn {
  const [open, setOpen] = useState(false);
  const [selectedSubscriber, setSelectedSubscriber] =
    useState<PreviewSubscriber | null>(null);
  const [payloadObj, setPayloadObj] = useState<Record<string, unknown>>({});
  const [notificationId, setNotificationId] = useState<string | null>(null);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: userProfile } = useUserProfile();
  const subscriberSearch = useSubscriberSearchInput();

  const triggerMutation = useWorkflowTrigger();
  const pollQuery = useNotificationPollQuery(notificationId ?? undefined);

  // Set default subscriber to authenticated user's profile on mount
  useEffect(() => {
    if (!userProfile) return;
    if (selectedSubscriber) return;

    setSelectedSubscriber({
      id: userProfile.id,
      firstName: userProfile.first_name,
      lastName: userProfile.last_name,
      email: userProfile.email || undefined,
    });
  }, [userProfile, selectedSubscriber]);

  // Clean up reset timeout on unmount
  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
        resetTimeoutRef.current = null;
      }
    };
  }, []);

  const handleTrigger = useCallback(async () => {
    if (!selectedSubscriber) return;

    const payload: Record<string, string> = {};
    for (const [k, v] of Object.entries(payloadObj)) {
      if (
        typeof v === 'string' ||
        typeof v === 'number' ||
        typeof v === 'boolean'
      ) {
        payload[k] = `${v}`;
      }
    }

    const isSystem = selectedSubscriber.id === userProfile?.id;

    const result = await triggerMutation.mutateAsync({
      workflow_id: workflowId,
      subscriber_id: selectedSubscriber.id,
      recipient: {
        email: selectedSubscriber.email,
        phone: selectedSubscriber.phone,
      },
      channels: selectedChannels,
      metadata: payload,
      is_system: isSystem,
    });

    setNotificationId(result.notification_id);
  }, [
    selectedSubscriber,
    payloadObj,
    workflowId,
    selectedChannels,
    userProfile?.id,
    triggerMutation,
  ]);

  const handleSelectSubscriber = useCallback(
    (subscriber: PreviewSubscriber) => {
      setSelectedSubscriber(subscriber);
      subscriberSearch.clearSearch();
      setNotificationId(null);
      triggerMutation.reset();
    },
    [subscriberSearch, triggerMutation],
  );

  const handleClearSubscriber = useCallback(() => {
    subscriberSearch.clearSearch();
    triggerMutation.reset();
    setSelectedSubscriber(null);
    setNotificationId(null);
  }, [subscriberSearch, triggerMutation]);

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      setOpen(newOpen);
      if (newOpen && resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
        resetTimeoutRef.current = null;
      }
      if (!newOpen) {
        resetTimeoutRef.current = setTimeout(() => {
          resetTimeoutRef.current = null;
          setSelectedSubscriber(null);
          setPayloadObj({});
          setNotificationId(null);
          triggerMutation.reset();
          subscriberSearch.clearSearch();
        }, 300);
      }
    },
    [triggerMutation, subscriberSearch],
  );

  const isTriggering = triggerMutation.isPending;
  const isPolling = !!notificationId && pollQuery.isFetching && !pollQuery.data;
  const pollData = pollQuery.data;
  const isDone =
    !!pollData?.notification?.status &&
    ['sent', 'failed', 'partial_failed', 'partial_skipped', 'skipped'].includes(
      pollData.notification.status,
    );
  const events = pollData?.delivery_attempts ?? [];
  const hasError = triggerMutation.isError;
  const triggerError = triggerMutation.error?.message;

  const isValid =
    selectedSubscriber !== null &&
    !isTriggering &&
    (!hasChannelToggles || selectedChannels.length > 0);

  return {
    open,
    setOpen,
    selectedSubscriber,
    payloadObj,
    setPayloadObj,
    notificationId,
    isTriggering,
    isPolling,
    isDone,
    events,
    hasError,
    triggerError,
    isValid,
    handleTrigger,
    handleSelectSubscriber,
    handleOpenChange,
    handleClearSubscriber,
    subscriberSearch,
    userEmail: userProfile?.email,
    triggerMutation,
    setSelectedSubscriber,
    setNotificationId,
    resetNotificationId: () => setNotificationId(null),
  };
}

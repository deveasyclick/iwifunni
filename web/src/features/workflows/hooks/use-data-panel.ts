'use client';

import { useCallback, useEffect, useState } from 'react';
import { authApi } from '@/features/auth/api';
import type {
  PreviewSubscriber,
  UseDataPanelReturn,
} from '../types/data-panel';

/**
 * Hook that manages the preview subscriber context.
 */
export function useDataPanel(workflowId: string): UseDataPanelReturn {
  const [previewSubscriber, setPreviewSubscriber] =
    useState<PreviewSubscriber | null>(null);
  const [defaultSubscriber, setDefaultSubscriber] =
    useState<PreviewSubscriber | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingSubscribers] = useState(false);

  // Load default subscriber on mount
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const profile = await authApi.getUserProfile();
        const defaultPreview: PreviewSubscriber | null = profile
          ? {
              id: profile.id,
              firstName: profile.first_name,
              lastName: profile.last_name,
              email: profile.email,
            }
          : null;

        if (cancelled) return;

        setDefaultSubscriber(defaultPreview);
        setPreviewSubscriber(defaultPreview);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load data panel',
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [workflowId]);

  const selectPreviewSubscriber = useCallback(
    (subscriber: PreviewSubscriber) => {
      setPreviewSubscriber(subscriber);
    },
    [],
  );

  const resetToDefault = useCallback(() => {
    if (defaultSubscriber) {
      setPreviewSubscriber(defaultSubscriber);
    }
  }, [defaultSubscriber]);

  return {
    groups: [],
    allVariables: [],
    previewSubscriber,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    filteredGroups: [],
    selectPreviewSubscriber,
    resetToDefault,
    isSearchingSubscribers,
  };
}

export type { PreviewSubscriber };

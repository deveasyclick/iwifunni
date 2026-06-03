'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { workflowApi } from '../api';
import { validateWorkflowDefinitionDraft } from '../utils';
import type { WorkflowDefinition, WorkflowItem } from '@/app/types/workflow';

const normalizeDefinition = (
  definition?: WorkflowDefinition,
): WorkflowDefinition | undefined => {
  if (!definition) return undefined;

  return {
    trigger: {
      event:
        typeof definition.trigger?.event === 'string'
          ? definition.trigger.event
          : '',
    },
    nodes: Array.isArray(definition.nodes) ? definition.nodes : [],
    edges: Array.isArray(definition.edges) ? definition.edges : [],
  };
};

const getDefinitionIssues = (definition?: WorkflowDefinition) => {
  const normalized = normalizeDefinition(definition);
  if (!normalized) return [];

  return validateWorkflowDefinitionDraft(normalized);
};

export type WorkflowListResult = {
  items: WorkflowItem[];
  loading: boolean;
  error: string | null;
  search: string;
  setSearch: (value: string) => void;
  visibleItems: WorkflowItem[];
  mutatingID: string | null;
  publishWorkflow: (item: WorkflowItem) => Promise<void>;
  deleteWorkflow: (id: string) => Promise<void>;
  deletingItem: WorkflowItem | null;
  requestDelete: (item: WorkflowItem) => void;
  cancelDelete: () => void;
  refetch: () => Promise<void>;
};

export const useWorkflowList = (): WorkflowListResult => {
  const [items, setItems] = useState<WorkflowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [mutatingID, setMutatingID] = useState<string | null>(null);
  const [deletingItem, setDeletingItem] = useState<WorkflowItem | null>(null);

  const fetchWorkflows = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await workflowApi.getWorkflows();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workflows');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchWorkflows();
  }, [fetchWorkflows]);

  const visibleItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;

    return items.filter((item) => {
      const triggerEvent =
        item.triggerEvent ||
        normalizeDefinition(item.definition)?.trigger.event ||
        '';

      return (
        item.name.toLowerCase().includes(term) ||
        item.key.toLowerCase().includes(term) ||
        triggerEvent.toLowerCase().includes(term) ||
        (item.channels || []).some((channel) =>
          channel.toLowerCase().includes(term),
        )
      );
    });
  }, [items, search]);

  const publishWorkflow = async (item: WorkflowItem) => {
    setError(null);

    const publishIssues = getDefinitionIssues(item.definition);
    if (publishIssues.length > 0) {
      setError(`Cannot publish ${item.name}: ${publishIssues[0].message}`);
      return;
    }

    setMutatingID(`publish:${item.id}`);
    try {
      await workflowApi.publishWorkflow(item.id);
      await fetchWorkflows();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to publish workflow',
      );
    } finally {
      setMutatingID(null);
    }
  };

  const deleteWorkflow = async (id: string) => {
    setError(null);
    setMutatingID(id);
    try {
      await workflowApi.archiveWorkflow(id);
      await fetchWorkflows();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to archive workflow',
      );
    } finally {
      setMutatingID(null);
      setDeletingItem(null);
    }
  };

  const requestDelete = (item: WorkflowItem) => {
    setDeletingItem(item);
  };

  const cancelDelete = () => {
    setDeletingItem(null);
  };

  return {
    items,
    loading,
    error,
    search,
    setSearch,
    visibleItems,
    mutatingID,
    publishWorkflow,
    deleteWorkflow,
    deletingItem,
    requestDelete,
    cancelDelete,
    refetch: fetchWorkflows,
  };
};

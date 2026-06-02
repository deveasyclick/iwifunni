'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import CardBox from '@/app/components/shared/CardBox';
import { workflowApi } from '@/app/dashboard/components/workflows/api';
import type { WorkflowDefinition, WorkflowItem } from '@/app/types/workflow';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { validateWorkflowDefinitionDraft } from './utils';

const formatCreatedAt = (value?: string) => {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return format(parsed, 'MMM d, yyyy');
};

const normalizeDefinition = (
  definition?: WorkflowDefinition,
): WorkflowDefinition | undefined => {
  if (!definition) {
    return undefined;
  }

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
  if (!normalized) {
    return [];
  }

  return validateWorkflowDefinitionDraft(normalized);
};

const WorkflowManagement = () => {
  const [items, setItems] = useState<WorkflowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [mutatingID, setMutatingID] = useState<string | null>(null);

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
    if (!term) {
      return items;
    }

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
    if (!confirm('Archive this workflow?')) {
      return;
    }

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
    }
  };

  return (
    <CardBox className="p-6">
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h5 className="card-title">Workflows</h5>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage workflow drafts and published automations for this project.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search workflows"
            className="w-full sm:w-64"
          />
          <Button
            asChild
            className="bg-primary text-primary-foreground hover:bg-primaryemphasis"
          >
            <Link href="/dashboard/workflows/new">Add Workflow</Link>
          </Button>
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Trigger</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-end">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground"
                >
                  Loading workflows...
                </TableCell>
              </TableRow>
            ) : visibleItems.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground"
                >
                  No workflows configured yet.
                </TableCell>
              </TableRow>
            ) : (
              visibleItems.map((item) => {
                const normalizedDefinition = normalizeDefinition(
                  item.definition,
                );
                const definitionIssues =
                  item.status !== 'active'
                    ? getDefinitionIssues(normalizedDefinition)
                    : [];

                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        {item.description && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {item.description}
                          </p>
                        )}
                        {definitionIssues.length > 0 && (
                          <p className="mt-1 text-xs text-destructive">
                            {definitionIssues[0].message}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {item.key}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {item.triggerEvent ||
                          normalizedDefinition?.trigger.event ||
                          'Not configured'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.status === 'active'
                            ? 'lightSuccess'
                            : 'secondary'
                        }
                      >
                        {item.status || (item.isActive ? 'active' : 'archived')}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.version ?? 1}</TableCell>
                    <TableCell>{formatCreatedAt(item.createdAt)}</TableCell>
                    <TableCell className="text-end">
                      <div className="flex justify-end gap-2">
                        <Button asChild variant="ghost" size="sm">
                          <Link
                            href={`/dashboard/workflows/new/builder?workflowId=${item.id}`}
                          >
                            Edit
                          </Link>
                        </Button>
                        {item.status !== 'active' && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={mutatingID === `publish:${item.id}`}
                            onClick={() => void publishWorkflow(item)}
                          >
                            {mutatingID === `publish:${item.id}`
                              ? 'Publishing...'
                              : 'Publish'}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={mutatingID === item.id}
                          onClick={() => void deleteWorkflow(item.id)}
                        >
                          {mutatingID === item.id ? 'Archiving...' : 'Archive'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </CardBox>
  );
};

export default WorkflowManagement;

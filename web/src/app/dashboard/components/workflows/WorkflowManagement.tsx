'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import CardBox from '@/app/components/shared/CardBox';
import { useWorkflowList } from './hooks/use-workflow-list';
import type { WorkflowItem } from '@/app/types/workflow';
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

const formatCreatedAt = (value?: string) => {
  if (!value) return '-';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';

  return format(parsed, 'MMM d, yyyy');
};

const renderTableBody = (
  loading: boolean,
  visibleItems: WorkflowItem[],
  mutatingID: string | null,
  publishWorkflow: (item: WorkflowItem) => Promise<void>,
  deleteWorkflow: (id: string) => Promise<void>,
) => {
  if (loading) {
    return (
      <TableRow>
        <TableCell colSpan={7} className="text-center text-muted-foreground">
          Loading workflows...
        </TableCell>
      </TableRow>
    );
  }

  if (visibleItems.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={7} className="text-center text-muted-foreground">
          No workflows configured yet.
        </TableCell>
      </TableRow>
    );
  }

  return visibleItems.map((item) => {
    const triggerEvent =
      item.triggerEvent || item.definition?.trigger.event || 'Not configured';

    const statusBadgeVariant =
      item.status === 'active'
        ? ('lightSuccess' as const)
        : ('secondary' as const);
    const statusLabel = item.status || (item.isActive ? 'active' : 'archived');
    const isPublishing = mutatingID === `publish:${item.id}`;
    const isArchiving = mutatingID === item.id;

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
          </div>
        </TableCell>
        <TableCell className="font-mono text-xs">{item.key}</TableCell>
        <TableCell>
          <span className="text-sm text-muted-foreground">{triggerEvent}</span>
        </TableCell>
        <TableCell>
          <Badge variant={statusBadgeVariant}>{statusLabel}</Badge>
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
                disabled={isPublishing}
                onClick={() => void publishWorkflow(item)}
              >
                {isPublishing ? 'Publishing...' : 'Publish'}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              disabled={isArchiving}
              onClick={() => void deleteWorkflow(item.id)}
            >
              {isArchiving ? 'Archiving...' : 'Archive'}
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  });
};

const WorkflowManagement = () => {
  const {
    visibleItems,
    loading,
    error,
    search,
    setSearch,
    mutatingID,
    publishWorkflow,
    deleteWorkflow,
  } = useWorkflowList();

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
            {renderTableBody(
              loading,
              visibleItems,
              mutatingID,
              publishWorkflow,
              deleteWorkflow,
            )}
          </TableBody>
        </Table>
      </div>
    </CardBox>
  );
};

export default WorkflowManagement;

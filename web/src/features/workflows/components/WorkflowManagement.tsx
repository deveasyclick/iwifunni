'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import CardBox from '@/components/card/CardBox';
import { useWorkflowList } from '../hooks/use-workflow-list';
import { DeleteWorkflowDialog } from './dialogs/DeleteWorkflowDialog';
import CreateWorkflow from './CreateWorkflow';
import type { WorkflowItem } from '@/app/types/workflow';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
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
  requestDelete: (item: WorkflowItem) => void,
) => {
  if (loading) {
    return (
      <TableRow>
        <TableCell colSpan={5} className="text-center text-muted-foreground">
          Loading workflows...
        </TableCell>
      </TableRow>
    );
  }

  if (visibleItems.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={5} className="text-center text-muted-foreground">
          No workflows configured yet.
        </TableCell>
      </TableRow>
    );
  }

  return visibleItems.map((item) => {
    const statusBadgeVariant =
      item.status === 'active'
        ? ('lightSuccess' as const)
        : ('secondary' as const);
    const statusLabel = item.status || (item.isActive ? 'active' : 'archived');
    const isDeleting = mutatingID === item.id;

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
          <Badge variant={statusBadgeVariant}>{statusLabel}</Badge>
        </TableCell>
        <TableCell>{formatCreatedAt(item.createdAt)}</TableCell>
        <TableCell>
          <div className="flex gap-1">
            <Button asChild variant="ghost" size="icon">
              <Link
                href={`/dashboard/workflows/new/builder?workflowId=${item.id}`}
              >
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Edit</span>
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              disabled={isDeleting}
              onClick={() => requestDelete(item)}
            >
              {isDeleting ? (
                <span className="text-xs">...</span>
              ) : (
                <Trash2 className="h-4 w-4 text-destructive" />
              )}
              <span className="sr-only">Delete</span>
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
    deleteWorkflow,
    deletingItem,
    requestDelete,
    cancelDelete,
  } = useWorkflowList();

  const [showCreate, setShowCreate] = useState(false);

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
            onClick={() => setShowCreate(true)}
            className="bg-primary text-primary-foreground hover:bg-primaryemphasis"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add Workflow
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
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {renderTableBody(loading, visibleItems, mutatingID, requestDelete)}
          </TableBody>
        </Table>
      </div>

      <DeleteWorkflowDialog
        deletingItem={deletingItem}
        mutatingID={mutatingID}
        onConfirm={(id) => void deleteWorkflow(id)}
        onCancel={cancelDelete}
      />

      <Dialog
        open={showCreate}
        onOpenChange={(open) => {
          if (!open) setShowCreate(false);
        }}
      >
        <CreateWorkflow onClose={() => setShowCreate(false)} />
      </Dialog>
    </CardBox>
  );
};

export default WorkflowManagement;

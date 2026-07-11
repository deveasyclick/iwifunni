'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import CardBox from '@/components/card/CardBox';
import { useWorkflowList } from '../hooks/use-workflow-list';
import { DeleteWorkflowDialog } from './dialogs/DeleteWorkflowDialog';
import WorkflowTableBody from './WorkflowTableBody';
import CreateWorkflow from './CreateWorkflow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { Table, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <WorkflowTableBody
            loading={loading}
            visibleItems={visibleItems}
            mutatingID={mutatingID}
            onRequestDelete={requestDelete}
          />
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

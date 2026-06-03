'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useWorkflowCreate } from './hooks/use-workflow-create';

const CreateWorkflow = () => {
  const {
    key,
    name,
    description,
    errors,
    error,
    creating,
    setKey,
    setName,
    setDescription,
    continueToBuilder,
    handleOpenChange,
  } = useWorkflowCreate();

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl border border-border/60 bg-card p-0 text-card-foreground shadow-2xl">
        <div className="p-6 sm:p-7">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="text-xl font-semibold text-foreground">
              Workflow Setup
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Name the workflow and define its metadata before moving to the
              canvas and inspector.
            </DialogDescription>
          </DialogHeader>

          {error ? (
            <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div>
              <label
                className="mb-2 block text-sm font-medium"
                htmlFor="workflow-key"
              >
                Key
              </label>
              <Input
                id="workflow-key"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="user_onboarding"
              />
              {errors.key ? (
                <p className="mt-1 text-xs text-error">{errors.key}</p>
              ) : null}
            </div>
            <div>
              <label
                className="mb-2 block text-sm font-medium"
                htmlFor="workflow-name"
              >
                Name
              </label>
              <Input
                id="workflow-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="User Onboarding"
              />
              {errors.name ? (
                <p className="mt-1 text-xs text-error">{errors.name}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-4">
            <label
              className="mb-2 block text-sm font-medium"
              htmlFor="workflow-description"
            >
              Description
            </label>
            <Textarea
              id="workflow-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-24"
              placeholder="Triggered after a new account is created"
            />
          </div>

          <DialogFooter className="mt-6 flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button asChild variant="outline">
              <Link href="/dashboard/workflows">Cancel</Link>
            </Button>
            <Button
              onClick={() => void continueToBuilder()}
              disabled={creating}
              className="bg-primary text-primary-foreground hover:bg-primaryemphasis"
            >
              {creating ? 'Creating draft...' : 'Continue to canvas'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateWorkflow;

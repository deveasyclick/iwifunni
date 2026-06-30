'use client';

import { FormEvent, useState } from 'react';
import { format } from 'date-fns';
import { Icon } from '@iconify/react';
import CardBox from '@/components/card/CardBox';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ApiKeyItem, ApiKeySecretResponse } from '@/app/types/api-key';
import {
  useApiKeyList,
  useCreateApiKey,
  useDeleteApiKey,
} from './queries';

function DeleteKeyDialog({
  open,
  onOpenChange,
  keyName,
  onConfirm,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  keyName: string;
  onConfirm: () => Promise<void>;
  isPending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border bg-card text-foreground">
        <DialogHeader>
          <DialogTitle>Delete API key</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            This API key <span className="font-semibold text-foreground">{keyName}</span> will immediately
            be disabled. API requests made using this key will be rejected, which
            could cause any systems still depending on it to break. Once deleted,
            you&apos;ll no longer be able to view or modify this API key.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={isPending}
            onClick={() => void onConfirm()}
          >
            {isPending ? 'Deleting...' : 'Delete key'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const ApiKeyManagement = () => {
  const {
    data: keys = [],
    isLoading: loading,
    error: queryError,

  } = useApiKeyList();
  const createApiKey = useCreateApiKey();
  const deleteApiKey = useDeleteApiKey();

  const [createOpen, setCreateOpen] = useState(false);
  const [createdSecret, setCreatedSecret] =
    useState<ApiKeySecretResponse | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'done'>('idle');

  const [keyToDelete, setKeyToDelete] = useState<ApiKeyItem | null>(null);

  const isMutating =
    createApiKey.isPending ||
    deleteApiKey.isPending;

  const submitCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Name is required');
      return;
    }

    try {
      const created = await createApiKey.mutateAsync({ name: trimmedName });
      setCreatedSecret(created);
      setCreateOpen(false);
      setName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create API key');
    }
  };

  const handleDelete = async () => {
    if (!keyToDelete) return;

    setError(null);
    try {
      await deleteApiKey.mutateAsync(keyToDelete.id);
      setKeyToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete API key');
    }
  };

  const copySecret = async () => {
    if (!createdSecret?.key) {
      return;
    }
    try {
      await navigator.clipboard.writeText(createdSecret.key);
      setCopyState('done');
      setTimeout(() => setCopyState('idle'), 1500);
    } catch {
      setError('Unable to copy key. Please copy it manually.');
    }
  };

  return (
    <CardBox className="p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h5 className="card-title">Project API Keys</h5>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage keys used by your services.
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primaryemphasis">
              Generate API Key
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl border-border bg-card text-foreground">
            <DialogHeader>
              <DialogTitle>Generate API Key</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                The secret key will be shown once. Copy and store it securely.
              </DialogDescription>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                void submitCreate(e);
              }}
            >
              <div>
                <label
                  className="text-sm font-medium mb-2 block"
                  htmlFor="key-name"
                >
                  Name
                </label>
                <Input
                  id="key-name"
                  placeholder="Production notifications"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={createApiKey.isPending}
                  className="bg-primary text-primary-foreground hover:bg-primaryemphasis"
                >
                  {createApiKey.isPending ? 'Generating...' : 'Generate key'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {(error || queryError) && (
        <div className="mt-4 rounded-md border border-error/30 bg-lighterror p-3 text-sm text-error">
          {error ||
            (queryError instanceof Error
              ? queryError.message
              : 'Failed to load API keys')}
        </div>
      )}

      <div className="mt-4 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Last Used</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground"
                >
                  Loading API keys...
                </TableCell>
              </TableRow>
            )}
            {!loading && keys.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground"
                >
                  No API keys found.
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              keys.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(item.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.last_used_at
                      ? format(new Date(item.last_used_at), 'MMM d, yyyy')
                      : 'Never'}
                  </TableCell>
                  <TableCell>
                    <div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-error hover:bg-error/10"
                        onClick={() => setKeyToDelete(item)}
                        disabled={isMutating}
                        title="Delete API key"
                      >
                        <Icon icon="tabler:trash" height={18} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <DeleteKeyDialog
        open={Boolean(keyToDelete)}
        onOpenChange={(open) => {
          if (!open) setKeyToDelete(null);
        }}
        keyName={keyToDelete?.name ?? ''}
        onConfirm={() => handleDelete()}
        isPending={deleteApiKey.isPending}
      />

      <Dialog
        open={Boolean(createdSecret)}
        onOpenChange={(open) => {
          if (!open) {
            setCreatedSecret(null);
            setCopyState('idle');
          }
        }}
      >
        <DialogContent className="max-w-xl border-border bg-card text-foreground">
          <DialogHeader>
            <DialogTitle>Save Your API Key</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Please save this API key somewhere safe and accessible. For
              security reasons, you won&apos;t be able to view it again through
              your account. If you lose this API key, you&apos;ll need to
              generate a new one.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md bg-muted/80 border border-border p-4">
            <p className="font-mono text-sm break-all text-foreground select-all">
              {createdSecret?.key}
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCreatedSecret(null);
                setCopyState('idle');
              }}
            >
              Done
            </Button>
            <Button
              variant="default"
              size="sm"
              className="gap-1.5"
              onClick={() => void copySecret()}
            >
              <Icon
                icon={copyState === 'done' ? 'tabler:check' : 'tabler:copy'}
                height={16}
              />
              {copyState === 'done' ? 'Copied!' : 'Copy API Key'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CardBox>
  );
};

export default ApiKeyManagement;

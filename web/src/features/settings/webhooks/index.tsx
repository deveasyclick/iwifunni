'use client';

import { FormEvent, useMemo, useState } from 'react';
import { format } from 'date-fns';
import CardBox from '@/components/card/CardBox';
import { Badge } from '@/components/ui/badge';
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
import type { CreateWebhookPayload, WebhookItem } from '@/app/types/webhook';
import { useWebhookList, useCreateWebhook, useDeleteWebhook } from './queries';

function webhookTableBody(
  loading: boolean,
  items: WebhookItem[],
  deleteWebhook: (id: string) => Promise<void>,
  isMutating: boolean,
) {
  if (loading) {
    return (
      <TableRow>
        <TableCell colSpan={5} className="text-center text-muted-foreground">
          Loading webhooks...
        </TableCell>
      </TableRow>
    );
  }

  if (items.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={5} className="text-center text-muted-foreground">
          No webhooks found.
        </TableCell>
      </TableRow>
    );
  }

  return items.map((item) => (
    <TableRow key={item.id}>
      <TableCell className="max-w-md truncate">{item.url}</TableCell>
      <TableCell>
        <div className="flex gap-1 flex-wrap">
          {item.events.map((event) => (
            <Badge key={event} variant="outline" className="text-xs">
              {event}
            </Badge>
          ))}
        </div>
      </TableCell>
      <TableCell>
        <Badge
          variant={item.is_active ? 'lightSuccess' : 'lightWarning'}
          className="rounded-md"
        >
          {item.is_active ? 'active' : 'inactive'}
        </Badge>
      </TableCell>
      <TableCell>{format(new Date(item.created_at), 'E, MMM d')}</TableCell>
      <TableCell className="text-end">
        <Button
          variant="outline"
          size="sm"
          disabled={isMutating}
          onClick={() => void deleteWebhook(item.id)}
        >
          {isMutating ? 'Deleting...' : 'Delete'}
        </Button>
      </TableCell>
    </TableRow>
  ));
}

const WebhookManagement = () => {
  const {
    data: items = [],
    isLoading: loading,
    error: queryError,
  } = useWebhookList();
  const createWebhook = useCreateWebhook();
  const deleteWebhookMutation = useDeleteWebhook();

  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [url, setURL] = useState('');
  const [secret, setSecret] = useState('');
  const [events, setEvents] = useState('notification.sent,notification.failed');

  const visibleItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return items;
    }

    return items.filter((item) => {
      return (
        item.url.toLowerCase().includes(term) ||
        item.events.join(',').toLowerCase().includes(term)
      );
    });
  }, [items, search]);

  const submitCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const payload: CreateWebhookPayload = {
      url: url.trim(),
      secret: secret.trim(),
      events: events
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    };

    if (!payload.url || !payload.secret || payload.events.length === 0) {
      setError('URL, secret, and at least one event are required');
      return;
    }

    try {
      await createWebhook.mutateAsync(payload);
      setOpen(false);
      setURL('');
      setSecret('');
      setEvents('notification.sent,notification.failed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create webhook');
    }
  };

  const deleteWebhook = async (id: string) => {
    if (!confirm('Delete this webhook?')) {
      return;
    }

    setError(null);
    try {
      await deleteWebhookMutation.mutateAsync(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete webhook');
    }
  };

  return (
    <CardBox className="p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
        <div>
          <h5 className="card-title">Webhook Endpoints</h5>
          <p className="text-sm text-muted-foreground mt-1">
            Register and remove outbound notification event destinations.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primaryemphasis">
              Add Webhook
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl border-border bg-card text-foreground">
            <DialogHeader>
              <DialogTitle>Create Webhook</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Enter the destination URL, secret, and comma-separated events.
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
                  htmlFor="webhook-url"
                >
                  URL
                </label>
                <Input
                  id="webhook-url"
                  value={url}
                  onChange={(e) => setURL(e.target.value)}
                  placeholder="https://example.com/webhooks/notifications"
                />
              </div>
              <div>
                <label
                  className="text-sm font-medium mb-2 block"
                  htmlFor="webhook-secret"
                >
                  Secret
                </label>
                <Input
                  id="webhook-secret"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="whsec_xxx"
                />
              </div>
              <div>
                <label
                  className="text-sm font-medium mb-2 block"
                  htmlFor="webhook-events"
                >
                  Events
                </label>
                <Input
                  id="webhook-events"
                  value={events}
                  onChange={(e) => setEvents(e.target.value)}
                  placeholder="notification.sent,notification.failed"
                />
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={createWebhook.isPending}
                  className="bg-primary text-primary-foreground hover:bg-primaryemphasis"
                >
                  {createWebhook.isPending ? 'Saving...' : 'Create webhook'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {(error || queryError) && (
        <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error ||
            (queryError instanceof Error
              ? queryError.message
              : 'Failed to load webhooks')}
        </p>
      )}

      <div className="flex justify-end mb-4">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search webhooks"
          className="max-w-xs"
        />
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>URL</TableHead>
              <TableHead>Events</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-end">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {webhookTableBody(
              loading,
              visibleItems,
              deleteWebhook,
              deleteWebhookMutation.isPending,
            )}
          </TableBody>
        </Table>
      </div>
    </CardBox>
  );
};

export default WebhookManagement;

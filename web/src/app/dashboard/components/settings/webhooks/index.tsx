'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import CardBox from '@/app/components/shared/CardBox';
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

const parseError = async (res: Response): Promise<string> => {
  const fallback = 'Request failed';
  try {
    const body = (await res.json()) as { error?: string; message?: string };
    return body.error || body.message || fallback;
  } catch {
    return fallback;
  }
};

const WebhookManagement = () => {
  const [items, setItems] = useState<WebhookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [mutatingID, setMutatingID] = useState<string | null>(null);
  const [url, setURL] = useState('');
  const [secret, setSecret] = useState('');
  const [events, setEvents] = useState('notification.sent,notification.failed');

  const fetchWebhooks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/webhooks', {
        method: 'GET',
        headers: { browserrefreshed: 'false' },
        cache: 'no-store',
      });

      if (!res.ok) {
        throw new Error(await parseError(res));
      }

      const data = (await res.json()) as WebhookItem[];
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load webhooks');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchWebhooks();
  }, [fetchWebhooks]);

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

    setMutatingID('create');
    try {
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(await parseError(res));
      }

      setOpen(false);
      setURL('');
      setSecret('');
      setEvents('notification.sent,notification.failed');
      await fetchWebhooks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create webhook');
    } finally {
      setMutatingID(null);
    }
  };

  const deleteWebhook = async (id: string) => {
    if (!confirm('Delete this webhook?')) {
      return;
    }

    setError(null);
    setMutatingID(id);
    try {
      const res = await fetch(`/api/webhooks/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok && res.status !== 204) {
        throw new Error(await parseError(res));
      }

      await fetchWebhooks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete webhook');
    } finally {
      setMutatingID(null);
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
                  disabled={mutatingID === 'create'}
                  className="bg-primary text-primary-foreground hover:bg-primaryemphasis"
                >
                  {mutatingID === 'create' ? 'Saving...' : 'Create webhook'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
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
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground"
                >
                  Loading webhooks...
                </TableCell>
              </TableRow>
            ) : visibleItems.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground"
                >
                  No webhooks found.
                </TableCell>
              </TableRow>
            ) : (
              visibleItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="max-w-md truncate">
                    {item.url}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {item.events.map((event) => (
                        <Badge
                          key={event}
                          variant="outline"
                          className="text-xs"
                        >
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
                  <TableCell>
                    {format(new Date(item.created_at), 'E, MMM d')}
                  </TableCell>
                  <TableCell className="text-end">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={mutatingID === item.id}
                      onClick={() => void deleteWebhook(item.id)}
                    >
                      {mutatingID === item.id ? 'Deleting...' : 'Delete'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </CardBox>
  );
};

export default WebhookManagement;

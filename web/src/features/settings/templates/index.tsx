'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import type { CreateTemplatePayload, TemplateItem } from '@/app/types/template';

const parseError = async (res: Response): Promise<string> => {
  const fallback = 'Request failed';
  try {
    const body = (await res.json()) as { error?: string; message?: string };
    return body.error || body.message || fallback;
  } catch {
    return fallback;
  }
};

function templateTableBody(
  loading: boolean,
  items: TemplateItem[],
  deleteTemplate: (id: string) => Promise<void>,
  mutatingID: string | null,
) {
  if (loading) {
    return (
      <TableRow>
        <TableCell colSpan={6} className="text-center text-muted-foreground">
          Loading templates...
        </TableCell>
      </TableRow>
    );
  }

  if (items.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={6} className="text-center text-muted-foreground">
          No templates found.
        </TableCell>
      </TableRow>
    );
  }

  return items.map((item) => (
    <TableRow key={item.id}>
      <TableCell>{item.name}</TableCell>
      <TableCell>{item.channel}</TableCell>
      <TableCell>
        <Badge
          variant={item.is_active ? 'lightSuccess' : 'lightWarning'}
          className="rounded-md"
        >
          {item.is_active ? 'active' : 'inactive'}
        </Badge>
      </TableCell>
      <TableCell>{item.version}</TableCell>
      <TableCell>{format(new Date(item.created_at), 'E, MMM d')}</TableCell>
      <TableCell className="text-end">
        <Button
          variant="outline"
          size="sm"
          disabled={mutatingID === item.id}
          onClick={() => void deleteTemplate(item.id)}
        >
          {mutatingID === item.id ? 'Deleting...' : 'Delete'}
        </Button>
      </TableCell>
    </TableRow>
  ));
}

const TemplateManagement = () => {
  const [items, setItems] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [mutatingID, setMutatingID] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [channel, setChannel] = useState('email');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/templates', {
        method: 'GET',
        headers: { browserrefreshed: 'false' },
        cache: 'no-store',
      });

      if (!res.ok) {
        throw new Error(await parseError(res));
      }

      const data = (await res.json()) as TemplateItem[];
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTemplates();
  }, [fetchTemplates]);

  const visibleItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return items;
    }

    return items.filter((item) => {
      return (
        item.name.toLowerCase().includes(term) ||
        item.channel.toLowerCase().includes(term) ||
        item.body.toLowerCase().includes(term)
      );
    });
  }, [items, search]);

  const submitCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !body.trim()) {
      setError('Template name and body are required');
      return;
    }

    const payload: CreateTemplatePayload = {
      name: name.trim(),
      channel,
      body: body.trim(),
      subject: subject.trim() || undefined,
    };

    setMutatingID('create');
    try {
      const res = await fetch('/api/templates', {
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
      setName('');
      setChannel('email');
      setSubject('');
      setBody('');
      await fetchTemplates();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create template',
      );
    } finally {
      setMutatingID(null);
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm('Delete this template?')) {
      return;
    }

    setError(null);
    setMutatingID(id);
    try {
      const res = await fetch(`/api/templates/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok && res.status !== 204) {
        throw new Error(await parseError(res));
      }

      await fetchTemplates();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete template',
      );
    } finally {
      setMutatingID(null);
    }
  };

  return (
    <CardBox className="p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
        <div>
          <h5 className="card-title">Templates</h5>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage reusable notification templates for your project.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primaryemphasis">
              Add Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl border-border bg-card text-foreground">
            <DialogHeader>
              <DialogTitle>Create Template</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Create an email, SMS, or push template for the current project.
              </DialogDescription>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                void submitCreate(e);
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    className="text-sm font-medium mb-2 block"
                    htmlFor="template-name"
                  >
                    Name
                  </label>
                  <Input
                    id="template-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Welcome Email"
                  />
                </div>
                <div>
                  <label
                    className="text-sm font-medium mb-2 block"
                    htmlFor="template-channel"
                  >
                    Channel
                  </label>
                  <select
                    id="template-channel"
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                  >
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                    <option value="push">Push</option>
                  </select>
                </div>
              </div>
              <div>
                <label
                  className="text-sm font-medium mb-2 block"
                  htmlFor="template-subject"
                >
                  Subject
                </label>
                <Input
                  id="template-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Welcome to Iwifunni"
                />
              </div>
              <div>
                <label
                  className="text-sm font-medium mb-2 block"
                  htmlFor="template-body"
                >
                  Body
                </label>
                <Textarea
                  id="template-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="min-h-36"
                  placeholder="Hello {{.name}}"
                />
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={mutatingID === 'create'}
                  className="bg-primary text-primary-foreground hover:bg-primaryemphasis"
                >
                  {mutatingID === 'create' ? 'Saving...' : 'Create template'}
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
          placeholder="Search templates"
          className="max-w-xs"
        />
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-end">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templateTableBody(
              loading,
              visibleItems,
              deleteTemplate,
              mutatingID,
            )}
          </TableBody>
        </Table>
      </div>
    </CardBox>
  );
};

export default TemplateManagement;

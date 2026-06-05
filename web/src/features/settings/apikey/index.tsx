'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Icon } from '@iconify/react';
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
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type {
  ApiKeyItem,
  ApiKeySecretResponse,
  CreateApiKeyPayload,
} from '@/app/types/api-key';

const statusVariant = (
  status: string,
): 'lightSuccess' | 'lightWarning' | 'lightError' | 'lightInfo' => {
  switch (status) {
    case 'active':
      return 'lightSuccess';
    case 'revoked':
      return 'lightError';
    case 'rotating':
      return 'lightWarning';
    default:
      return 'lightInfo';
  }
};

const parseError = async (res: Response): Promise<string> => {
  const fallback = 'Request failed';
  try {
    const body = (await res.json()) as { error?: string; message?: string };
    return body.error || body.message || fallback;
  } catch {
    return fallback;
  }
};

const MOCK_KEYS: ApiKeyItem[] = [
  {
    id: 'key_1',
    name: 'Production API Key',
    key_prefix: 'nk_live_abc123',
    scopes: ['notifications:write'],
    status: 'active',
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'key_2',
    name: 'Development Key',
    key_prefix: 'nk_live_def456',
    scopes: ['notifications:write'],
    status: 'active',
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'key_3',
    name: 'Legacy Integration',
    key_prefix: 'nk_live_ghi789',
    scopes: ['notifications:write'],
    status: 'revoked',
    created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const ApiKeyManagement = () => {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [mutatingKeyID, setMutatingKeyID] = useState<string | null>(null);
  const [togglingKeyID, setTogglingKeyID] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createdSecret, setCreatedSecret] =
    useState<ApiKeySecretResponse | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'done'>('idle');

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/api-keys', {
        method: 'GET',
        headers: {
          browserrefreshed: 'false',
        },
        cache: 'no-store',
      });

      if (!res.ok) {
        throw new Error(await parseError(res));
      }

      const data = (await res.json()) as ApiKeyItem[];
      setKeys(Array.isArray(data) && data.length > 0 ? data : MOCK_KEYS);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load API keys');
      setKeys(MOCK_KEYS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchKeys();
  }, [fetchKeys]);

  const visibleKeys = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return keys;
    }

    return keys.filter((item) => {
      return (
        item.name.toLowerCase().includes(term) ||
        item.status.toLowerCase().includes(term)
      );
    });
  }, [keys, search]);

  const submitCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Name is required');
      return;
    }

    const payload: CreateApiKeyPayload = {
      name: trimmedName,
    };

    setMutatingKeyID('create');
    try {
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(await parseError(res));
      }

      const created = (await res.json()) as ApiKeySecretResponse;
      setCreatedSecret(created);
      setCreateOpen(false);
      setName('');
      await fetchKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create API key');
    } finally {
      setMutatingKeyID(null);
    }
  };

  const rotateKey = async (keyID: string) => {
    if (!confirm('Rotate this API key? The previous key will be revoked.')) {
      return;
    }

    setError(null);
    setMutatingKeyID(keyID);
    try {
      const res = await fetch(`/api/api-keys/${keyID}/rotate`, {
        method: 'POST',
      });

      if (!res.ok) {
        throw new Error(await parseError(res));
      }

      const rotated = (await res.json()) as ApiKeySecretResponse;
      setCreatedSecret(rotated);
      await fetchKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rotate API key');
    } finally {
      setMutatingKeyID(null);
    }
  };

  const revokeKey = async (keyID: string) => {
    if (!confirm('Revoke this API key? This action cannot be undone.')) {
      return;
    }

    setError(null);
    setMutatingKeyID(keyID);
    try {
      const res = await fetch(`/api/api-keys/${keyID}`, {
        method: 'DELETE',
      });

      if (!res.ok && res.status !== 204) {
        throw new Error(await parseError(res));
      }

      await fetchKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke API key');
    } finally {
      setMutatingKeyID(null);
    }
  };

  const toggleKeyStatus = async (keyID: string, currentStatus: string) => {
    setError(null);
    setTogglingKeyID(keyID);
    try {
      const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
      const res = await fetch(`/api/api-keys/${keyID}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        throw new Error(await parseError(res));
      }

      await fetchKeys();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Failed to ${currentStatus === 'active' ? 'disable' : 'enable'} API key`,
      );
    } finally {
      setTogglingKeyID(null);
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
            Create, rotate, and revoke keys used by your services.
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
                  disabled={mutatingKeyID === 'create'}
                  className="bg-primary text-primary-foreground hover:bg-primaryemphasis"
                >
                  {mutatingKeyID === 'create'
                    ? 'Generating...'
                    : 'Generate key'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-error/30 bg-lighterror p-3 text-sm text-error">
          {error}
        </div>
      )}

      <div className="mt-6 flex justify-between items-center gap-4">
        <div className="relative sm:max-w-72 max-w-full w-full">
          <Icon
            icon="tabler:search"
            height={18}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="text"
            className="pl-8 bg-background"
            onChange={(e) => setSearch(e.target.value)}
            value={search}
            placeholder="Search name, status"
          />
        </div>
        <Button variant="outline" onClick={() => void fetchKeys()}>
          Refresh
        </Button>
      </div>

      <div className="mt-4 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Enabled</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-end">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground"
                >
                  Loading API keys...
                </TableCell>
              </TableRow>
            ) : visibleKeys.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground"
                >
                  No API keys found.
                </TableCell>
              </TableRow>
            ) : (
              visibleKeys.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant={statusVariant(item.status)}
                      className="rounded-md capitalize"
                    >
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={item.status === 'active'}
                      onCheckedChange={() =>
                        void toggleKeyStatus(item.id, item.status)
                      }
                      disabled={togglingKeyID === item.id}
                      aria-label="Enable/disable API key"
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(item.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void rotateKey(item.id)}
                        disabled={mutatingKeyID === item.id}
                      >
                        Rotate
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="hover:text-error"
                        onClick={() => void revokeKey(item.id)}
                        disabled={mutatingKeyID === item.id}
                      >
                        Revoke
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

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
              This is the only time you can view this key secret.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-border bg-background p-3">
            <p className="text-xs text-muted-foreground mb-2">API key</p>
            <p className="font-mono text-sm break-all">{createdSecret?.key}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => void copySecret()}>
              {copyState === 'done' ? 'Copied' : 'Copy key'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CardBox>
  );
};

export default ApiKeyManagement;

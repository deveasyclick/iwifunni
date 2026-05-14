"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import CardBox from "@/app/components/shared/CardBox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { CreateProviderPayload, ProviderItem } from "@/app/types/provider";

const parseError = async (res: Response): Promise<string> => {
  const fallback = "Request failed";
  try {
    const body = (await res.json()) as { error?: string; message?: string };
    return body.error || body.message || fallback;
  } catch {
    return fallback;
  }
};

const ProviderManagement = () => {
  const [items, setItems] = useState<ProviderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [mutatingID, setMutatingID] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [channel, setChannel] = useState("email");
  const [credentialsJSON, setCredentialsJSON] = useState('{\n  "api_key": ""\n}');
  const [configJSON, setConfigJSON] = useState("{}");

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/providers", {
        method: "GET",
        headers: { browserrefreshed: "false" },
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(await parseError(res));
      }

      const data = (await res.json()) as ProviderItem[];
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load providers");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProviders();
  }, [fetchProviders]);

  const visibleItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return items;
    }

    return items.filter((item) => {
      return (
        item.name.toLowerCase().includes(term) ||
        item.channel.toLowerCase().includes(term)
      );
    });
  }, [items, search]);

  const submitCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    let credentials: Record<string, unknown>;
    let config: Record<string, unknown> | undefined;

    try {
      credentials = JSON.parse(credentialsJSON) as Record<string, unknown>;
      config = JSON.parse(configJSON) as Record<string, unknown>;
    } catch {
      setError("Credentials and config must be valid JSON objects");
      return;
    }

    if (!name.trim()) {
      setError("Provider name is required");
      return;
    }

    const payload: CreateProviderPayload = {
      name: name.trim(),
      channel,
      credentials,
      config,
    };

    setMutatingID("create");
    try {
      const res = await fetch("/api/providers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(await parseError(res));
      }

      setOpen(false);
      setName("");
      setChannel("email");
      setCredentialsJSON('{\n  "api_key": ""\n}');
      setConfigJSON("{}");
      await fetchProviders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create provider");
    } finally {
      setMutatingID(null);
    }
  };

  const deleteProvider = async (id: string) => {
    if (!confirm("Delete this provider?")) {
      return;
    }

    setError(null);
    setMutatingID(id);
    try {
      const res = await fetch(`/api/providers/${id}`, {
        method: "DELETE",
      });

      if (!res.ok && res.status !== 204) {
        throw new Error(await parseError(res));
      }

      await fetchProviders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete provider");
    } finally {
      setMutatingID(null);
    }
  };

  return (
    <CardBox className="p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
        <div>
          <h5 className="card-title">Delivery Providers</h5>
          <p className="text-sm text-muted-foreground mt-1">
            Manage project-scoped email, SMS, and push providers.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primaryemphasis">
              Add Provider
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl border-border bg-card text-foreground">
            <DialogHeader>
              <DialogTitle>Create Provider</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Enter the provider name, channel, and JSON credentials/config.
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={submitCreate}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block" htmlFor="provider-name">
                    Name
                  </label>
                  <Input
                    id="provider-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="sendgrid"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block" htmlFor="provider-channel">
                    Channel
                  </label>
                  <select
                    id="provider-channel"
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
                <label className="text-sm font-medium mb-2 block" htmlFor="provider-credentials">
                  Credentials JSON
                </label>
                <Textarea
                  id="provider-credentials"
                  value={credentialsJSON}
                  onChange={(e) => setCredentialsJSON(e.target.value)}
                  className="min-h-32 font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block" htmlFor="provider-config">
                  Config JSON
                </label>
                <Textarea
                  id="provider-config"
                  value={configJSON}
                  onChange={(e) => setConfigJSON(e.target.value)}
                  className="min-h-24 font-mono text-xs"
                />
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={mutatingID === "create"}
                  className="bg-primary text-primary-foreground hover:bg-primaryemphasis"
                >
                  {mutatingID === "create" ? "Saving..." : "Create provider"}
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
          placeholder="Search providers"
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
              <TableHead>Created</TableHead>
              <TableHead className="text-end">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Loading providers...
                </TableCell>
              </TableRow>
            ) : visibleItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No providers found.
                </TableCell>
              </TableRow>
            ) : (
              visibleItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.channel}</TableCell>
                  <TableCell>
                    <Badge variant={item.is_active ? "lightSuccess" : "lightWarning"} className="rounded-md">
                      {item.is_active ? "active" : "inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {item.created_at ? format(new Date(item.created_at), "E, MMM d") : "-"}
                  </TableCell>
                  <TableCell className="text-end">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={mutatingID === item.id}
                      onClick={() => void deleteProvider(item.id)}
                    >
                      {mutatingID === item.id ? "Deleting..." : "Delete"}
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

export default ProviderManagement;
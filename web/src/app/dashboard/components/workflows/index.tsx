"use client";

import Link from "next/link";
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
import type { CreateWorkflowPayload, WorkflowChannel, WorkflowItem } from "@/app/types/workflow";

const parseError = async (res: Response): Promise<string> => {
  const fallback = "Request failed";
  try {
    const body = (await res.json()) as { error?: string; message?: string };
    return body.error || body.message || fallback;
  } catch {
    return fallback;
  }
};

const channelOptions: WorkflowChannel[] = ["email", "sms", "push"];

const WorkflowManagement = () => {
  const [items, setItems] = useState<WorkflowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [mutatingID, setMutatingID] = useState<string | null>(null);
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [channels, setChannels] = useState<WorkflowChannel[]>(["email"]);
  const [templateIDsJSON, setTemplateIDsJSON] = useState("{}");

  const fetchWorkflows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/workflows", {
        method: "GET",
        headers: { browserrefreshed: "false" },
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(await parseError(res));
      }

      const data = (await res.json()) as WorkflowItem[];
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load workflows");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchWorkflows();
  }, [fetchWorkflows]);

  const visibleItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return items;
    }

    return items.filter((item) => {
      return (
        item.name.toLowerCase().includes(term) ||
        item.key.toLowerCase().includes(term) ||
        item.channels.some((channel) => channel.includes(term))
      );
    });
  }, [items, search]);

  const toggleChannel = (channel: WorkflowChannel) => {
    setChannels((current) =>
      current.includes(channel)
        ? current.filter((item) => item !== channel)
        : [...current, channel],
    );
  };

  const submitCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    let templateIds: Partial<Record<WorkflowChannel, string>> | undefined;
    try {
      templateIds = JSON.parse(templateIDsJSON) as Partial<
        Record<WorkflowChannel, string>
      >;
    } catch {
      setError("Template IDs must be a valid JSON object");
      return;
    }

    if (!key.trim() || !name.trim()) {
      setError("Workflow key and name are required");
      return;
    }
    if (channels.length === 0) {
      setError("Select at least one channel");
      return;
    }

    const payload: CreateWorkflowPayload = {
      key: key.trim(),
      name: name.trim(),
      description: description.trim() || undefined,
      channels,
      templateIds,
    };

    setMutatingID("create");
    try {
      const res = await fetch("/api/workflows", {
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
      setKey("");
      setName("");
      setDescription("");
      setChannels(["email"]);
      setTemplateIDsJSON("{}");
      await fetchWorkflows();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create workflow");
    } finally {
      setMutatingID(null);
    }
  };

  const deleteWorkflow = async (id: string) => {
    if (!confirm("Archive this workflow?")) {
      return;
    }

    setError(null);
    setMutatingID(id);
    try {
      const res = await fetch(`/api/workflows/${id}`, {
        method: "DELETE",
      });

      if (!res.ok && res.status !== 204) {
        throw new Error(await parseError(res));
      }

      await fetchWorkflows();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive workflow");
    } finally {
      setMutatingID(null);
    }
  };

  return (
    <CardBox className="p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
        <div>
          <h5 className="card-title">Workflows</h5>
          <p className="text-sm text-muted-foreground mt-1">
            Manage project-scoped workflow keys, channel resolution order, and
            template linkage.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primaryemphasis">
              Add Workflow
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl border-border bg-card text-foreground">
            <DialogHeader>
              <DialogTitle>Create Workflow</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Create a workflow key and define the channel order and optional
                template IDs that will back future workflow sends.
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={submitCreate}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block" htmlFor="workflow-key">
                    Key
                  </label>
                  <Input
                    id="workflow-key"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder="user_onboarding"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block" htmlFor="workflow-name">
                    Name
                  </label>
                  <Input
                    id="workflow-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="User Onboarding"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block" htmlFor="workflow-description">
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
              <div>
                <p className="text-sm font-medium mb-2">Channels</p>
                <div className="flex flex-wrap gap-2">
                  {channelOptions.map((channel) => (
                    <Button
                      key={channel}
                      type="button"
                      variant={channels.includes(channel) ? "default" : "outline"}
                      onClick={() => toggleChannel(channel)}
                      className="capitalize"
                    >
                      {channel}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block" htmlFor="workflow-template-ids">
                  Template IDs JSON
                </label>
                <Textarea
                  id="workflow-template-ids"
                  value={templateIDsJSON}
                  onChange={(e) => setTemplateIDsJSON(e.target.value)}
                  className="min-h-28 font-mono text-xs"
                  placeholder='{"email":"template-uuid"}'
                />
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={mutatingID === "create"}
                  className="bg-primary text-primary-foreground hover:bg-primaryemphasis"
                >
                  {mutatingID === "create" ? "Saving..." : "Create workflow"}
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
          placeholder="Search workflows"
          className="max-w-xs"
        />
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Channels</TableHead>
              <TableHead>Templates</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-end">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Loading workflows...
                </TableCell>
              </TableRow>
            ) : visibleItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No workflows configured yet.
                </TableCell>
              </TableRow>
            ) : (
              visibleItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.name}</p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{item.key}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {item.channels.map((channel) => (
                        <Badge key={channel} variant="outline" className="capitalize">
                          {channel}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {Object.keys(item.templateIds || {}).length} linked
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.isActive ? "lightSuccess" : "secondary"}>
                      {item.isActive ? "Active" : "Archived"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(item.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={mutatingID === item.id}
                      onClick={() => deleteWorkflow(item.id)}
                    >
                      {mutatingID === item.id ? "Archiving..." : "Archive"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 text-sm text-muted-foreground">
        Template IDs can be sourced from the
        {" "}
        <Link href="/dashboard/settings/templates" className="text-primary hover:underline">
          templates settings page
        </Link>
        .
      </div>
    </CardBox>
  );
};

export default WorkflowManagement;
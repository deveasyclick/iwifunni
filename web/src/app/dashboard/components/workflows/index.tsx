"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import CardBox from "@/app/components/shared/CardBox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type {
  WorkflowExecutionDetail,
  WorkflowExecutionItem,
  WorkflowItem,
} from "@/app/types/workflow";
import { workflowApi } from "@/app/dashboard/components/workflows/api";
import { validateWorkflowDefinitionDraft } from "@/app/dashboard/components/workflows/definition-builder";

const formatDateTime = (value?: string) => {
  if (!value) {
    return "-";
  }

  return format(new Date(value), "MMM d, yyyy HH:mm");
};

const formatJSONBlock = (value?: Record<string, unknown>) => {
  if (!value) {
    return null;
  }

  return JSON.stringify(value, null, 2);
};

const WorkflowManagement = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<WorkflowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [mutatingID, setMutatingID] = useState<string | null>(null);
  const [executions, setExecutions] = useState<WorkflowExecutionItem[]>([]);
  const [eventName, setEventName] = useState("user.signup");
  const [eventSubscriberID, setEventSubscriberID] = useState("");
  const [eventDataJSON, setEventDataJSON] = useState('{\n  "name": "Ada"\n}');
  const [executionWorkflowFilter, setExecutionWorkflowFilter] = useState<string>(() => searchParams.get("workflow") || "all");
  const [selectedExecutionID, setSelectedExecutionID] = useState<string | null>(() => searchParams.get("execution"));
  const [selectedExecution, setSelectedExecution] = useState<WorkflowExecutionDetail | null>(null);
  const [executionDetailLoading, setExecutionDetailLoading] = useState(false);

  const syncQueryState = useCallback((updates: { workflow?: string | null; execution?: string | null }) => {
    const nextParams = new URLSearchParams(searchParams.toString());

    if (updates.workflow !== undefined) {
      if (!updates.workflow || updates.workflow === "all") {
        nextParams.delete("workflow");
      } else {
        nextParams.set("workflow", updates.workflow);
      }
    }

    if (updates.execution !== undefined) {
      if (!updates.execution) {
        nextParams.delete("execution");
      } else {
        nextParams.set("execution", updates.execution);
      }
    }

    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const fetchWorkflows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await workflowApi.getWorkflows();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load workflows");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchExecutions = useCallback(async (workflowID?: string) => {
    const activeWorkflowID = workflowID ?? executionWorkflowFilter;
    const search = activeWorkflowID !== "all"
      ? `?workflow_id=${encodeURIComponent(activeWorkflowID)}`
      : "";

    try {
      const data = await workflowApi.getExecutions(
        activeWorkflowID !== "all" ? activeWorkflowID : undefined,
      );
      setExecutions(Array.isArray(data) ? data.slice(0, 10) : []);
    } catch {
      setExecutions([]);
    }
  }, [executionWorkflowFilter]);

  useEffect(() => {
    void fetchWorkflows();
  }, [fetchWorkflows]);

  useEffect(() => {
    void fetchExecutions(executionWorkflowFilter);
  }, [executionWorkflowFilter, fetchExecutions]);

  const visibleItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return items;
    }

    return items.filter((item) => {
      return (
        item.name.toLowerCase().includes(term) ||
        item.key.toLowerCase().includes(term) ||
        (item.triggerEvent || "").toLowerCase().includes(term) ||
        (item.channels || []).some((channel) => channel.includes(term))
      );
    });
  }, [items, search]);

  const publishWorkflow = async (item: WorkflowItem) => {
    setError(null);

    const publishIssues = item.definition ? validateWorkflowDefinitionDraft(item.definition) : [];
    if (publishIssues.length > 0) {
      setError(`Cannot publish ${item.name}: ${publishIssues[0].message}`);
      return;
    }

    setMutatingID(`publish:${item.id}`);
    try {
      await workflowApi.publishWorkflow(item.id);

      await fetchWorkflows();
      await fetchExecutions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish workflow");
    } finally {
      setMutatingID(null);
    }
  };

  const triggerEvent = async () => {
    setError(null);

    let data: Record<string, unknown> | undefined;
    try {
      data = JSON.parse(eventDataJSON) as Record<string, unknown>;
    } catch {
      setError("Event data must be valid JSON");
      return;
    }

    setMutatingID("trigger-event");
    try {
      await workflowApi.triggerEvent({
          event: eventName.trim(),
          subscriber_id: eventSubscriberID.trim() || undefined,
          data,
      });

      await fetchExecutions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to trigger workflow event");
    } finally {
      setMutatingID(null);
    }
  };

  const openExecution = useCallback(async (executionID: string, syncURL = true) => {
    setError(null);
    setSelectedExecutionID(executionID);
    setExecutionDetailLoading(true);

    if (syncURL) {
      syncQueryState({ execution: executionID });
    }

    try {
      const detail = await workflowApi.getExecution(executionID);
      setSelectedExecution(detail);
    } catch (err) {
      setSelectedExecution(null);
      setError(err instanceof Error ? err.message : "Failed to load execution detail");
    } finally {
      setExecutionDetailLoading(false);
    }
  }, [syncQueryState]);

  const closeExecution = (openState: boolean) => {
    if (openState) {
      return;
    }

    setSelectedExecutionID(null);
    setSelectedExecution(null);
    setExecutionDetailLoading(false);
    syncQueryState({ execution: null });
  };

  const workflowNames = useMemo(() => {
    return new Map(items.map((item) => [item.id, item.name]));
  }, [items]);

  const selectedWorkflowName = useMemo(() => {
    if (executionWorkflowFilter === "all") {
      return "All workflows";
    }

    return workflowNames.get(executionWorkflowFilter) || "Selected workflow";
  }, [executionWorkflowFilter, workflowNames]);

  const applyExecutionWorkflowFilter = useCallback((workflowID: string) => {
    setExecutionWorkflowFilter(workflowID);
    syncQueryState({ workflow: workflowID });
  }, [syncQueryState]);

  useEffect(() => {
    const workflowParam = searchParams.get("workflow") || "all";
    if (workflowParam !== executionWorkflowFilter) {
      setExecutionWorkflowFilter(workflowParam);
    }

    const executionParam = searchParams.get("execution");
    if (!executionParam) {
      if (selectedExecutionID !== null) {
        setSelectedExecutionID(null);
        setSelectedExecution(null);
        setExecutionDetailLoading(false);
      }
      return;
    }

    if (executionParam !== selectedExecutionID) {
      void openExecution(executionParam, false);
    }
  }, [executionWorkflowFilter, openExecution, searchParams, selectedExecutionID]);

  const deleteWorkflow = async (id: string) => {
    if (!confirm("Archive this workflow?")) {
      return;
    }

    setError(null);
    setMutatingID(id);
    try {
      await workflowApi.archiveWorkflow(id);

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
            Manage project-scoped workflow definitions, publish drafts, and
            prepare event-triggered automation.
          </p>
        </div>

        <Button asChild className="bg-primary text-primary-foreground hover:bg-primaryemphasis">
          <Link href="/dashboard/workflows/new">Add Workflow</Link>
        </Button>
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

      <div className="mb-6 rounded-xl border border-border p-4">
        <div className="flex flex-col gap-2 mb-4">
          <h6 className="font-medium">Trigger Event</h6>
          <p className="text-sm text-muted-foreground">
            Send a test event through the workflow runtime and inspect the queued executions below.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm font-medium mb-2 block" htmlFor="workflow-event-name">
              Event Name
            </label>
            <Input
              id="workflow-event-name"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="user.signup"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block" htmlFor="workflow-event-subscriber-id">
              Subscriber ID
            </label>
            <Input
              id="workflow-event-subscriber-id"
              value={eventSubscriberID}
              onChange={(e) => setEventSubscriberID(e.target.value)}
              placeholder="subscriber uuid"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="text-sm font-medium mb-2 block" htmlFor="workflow-event-data">
            Event Data JSON
          </label>
          <Textarea
            id="workflow-event-data"
            value={eventDataJSON}
            onChange={(e) => setEventDataJSON(e.target.value)}
            className="min-h-32 font-mono text-xs"
          />
        </div>

        <Button
          onClick={() => void triggerEvent()}
          disabled={mutatingID === "trigger-event"}
          className="bg-primary text-primary-foreground hover:bg-primaryemphasis"
        >
          {mutatingID === "trigger-event" ? "Triggering..." : "Trigger Event"}
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Trigger</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Version</TableHead>
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
                      {item.status !== "active" && item.definition && validateWorkflowDefinitionDraft(item.definition).length > 0 && (
                        <p className="text-xs text-destructive mt-1">
                          {validateWorkflowDefinitionDraft(item.definition)[0].message}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{item.key}</TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {item.triggerEvent || item.definition?.trigger?.event || "Not configured"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.status === "active" ? "lightSuccess" : "secondary"}>
                      {item.status || (item.isActive ? "active" : "archived")}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.version ?? 1}</TableCell>
                  <TableCell>
                    {format(new Date(item.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-end">
                    <div className="flex justify-end gap-2">
                      {item.status !== "active" && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={mutatingID === `publish:${item.id}`}
                          onClick={() => publishWorkflow(item)}
                        >
                          {mutatingID === `publish:${item.id}` ? "Publishing..." : "Publish"}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => applyExecutionWorkflowFilter(item.id)}
                      >
                        Executions
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={mutatingID === item.id}
                        onClick={() => deleteWorkflow(item.id)}
                      >
                        {mutatingID === item.id ? "Archiving..." : "Archive"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h6 className="font-medium">Recent Executions</h6>
            <p className="text-sm text-muted-foreground">
              Latest workflow runs created by matching trigger events for {selectedWorkflowName.toLowerCase()}.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={executionWorkflowFilter}
              onValueChange={applyExecutionWorkflowFilter}
            >
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Filter executions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All workflows</SelectItem>
                {items.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyExecutionWorkflowFilter("all")}
            >
              Reset
            </Button>
            <Button variant="outline" size="sm" onClick={() => void fetchExecutions()}>
              Refresh
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Execution</TableHead>
                <TableHead>Workflow</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Current Step</TableHead>
                <TableHead>Started</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {executions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No executions yet.
                  </TableCell>
                </TableRow>
              ) : (
                executions.map((execution) => (
                  <TableRow key={execution.id}>
                    <TableCell>
                      <Button
                        variant="link"
                        className="h-auto p-0 font-mono text-xs"
                        onClick={() => void openExecution(execution.id)}
                      >
                        {execution.id.slice(0, 8)}...
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{workflowNames.get(execution.workflowId) || "Unknown workflow"}</p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {execution.workflowId.slice(0, 8)}...
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={execution.status === "completed" ? "lightSuccess" : "secondary"}>
                        {execution.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{execution.currentStepId || "-"}</TableCell>
                    <TableCell>{formatDateTime(execution.startedAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Sheet open={selectedExecutionID !== null} onOpenChange={closeExecution}>
        <SheetContent side="right" className="w-full overflow-y-auto border-border bg-card p-6 text-foreground sm:max-w-2xl">
          <SheetHeader className="pr-8">
            <SheetTitle>Execution Detail</SheetTitle>
            <SheetDescription>
              Inspect workflow execution state, trigger payload, and step-level progress.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {executionDetailLoading ? (
              <p className="text-sm text-muted-foreground">Loading execution detail...</p>
            ) : !selectedExecution ? (
              <p className="text-sm text-muted-foreground">Execution detail unavailable.</p>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-border p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Workflow</p>
                    <p className="mt-2 text-sm font-medium">
                      {workflowNames.get(selectedExecution.workflowId) || "Unknown workflow"}
                    </p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground break-all">
                      {selectedExecution.workflowId}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Execution Status</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant={selectedExecution.status === "completed" ? "lightSuccess" : "secondary"}>
                        {selectedExecution.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Started {formatDateTime(selectedExecution.startedAt)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Current step: <span className="font-mono text-xs">{selectedExecution.currentStepId || "-"}</span>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-border p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Subscriber</p>
                    <p className="mt-2 font-mono text-xs break-all">{selectedExecution.subscriberId || "-"}</p>
                  </div>
                  <div className="rounded-xl border border-border p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Completed</p>
                    <p className="mt-2 text-sm">{formatDateTime(selectedExecution.completedAt)}</p>
                  </div>
                  <div className="rounded-xl border border-border p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Failed</p>
                    <p className="mt-2 text-sm">{formatDateTime(selectedExecution.failedAt)}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Trigger Payload</p>
                  <pre className="mt-3 overflow-x-auto rounded-lg bg-muted/40 p-3 font-mono text-xs text-muted-foreground">
                    {formatJSONBlock(selectedExecution.triggerPayload) || "No trigger payload"}
                  </pre>
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h6 className="font-medium">Step History</h6>
                    <span className="text-sm text-muted-foreground">
                      {selectedExecution.steps.length} steps
                    </span>
                  </div>

                  <div className="space-y-4">
                    {selectedExecution.steps.length === 0 ? (
                      <div className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
                        No step execution records yet.
                      </div>
                    ) : (
                      selectedExecution.steps.map((step) => (
                        <div key={step.id} className="rounded-xl border border-border p-4">
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{step.stepId}</p>
                                <Badge variant={step.status === "completed" ? "lightSuccess" : "secondary"}>
                                  {step.status}
                                </Badge>
                              </div>
                              <p className="mt-1 text-sm text-muted-foreground capitalize">
                                {step.stepType} step
                              </p>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Attempts: {step.attempts}
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div>
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Started</p>
                              <p className="mt-2 text-sm">{formatDateTime(step.startedAt)}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Completed</p>
                              <p className="mt-2 text-sm">{formatDateTime(step.completedAt)}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Failed</p>
                              <p className="mt-2 text-sm">{formatDateTime(step.failedAt)}</p>
                            </div>
                          </div>

                          <div className="mt-4 space-y-4">
                            {formatJSONBlock(step.input) && (
                              <div>
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">Input</p>
                                <pre className="mt-2 overflow-x-auto rounded-lg bg-muted/40 p-3 font-mono text-xs text-muted-foreground">
                                  {formatJSONBlock(step.input)}
                                </pre>
                              </div>
                            )}
                            {formatJSONBlock(step.output) && (
                              <div>
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">Output</p>
                                <pre className="mt-2 overflow-x-auto rounded-lg bg-muted/40 p-3 font-mono text-xs text-muted-foreground">
                                  {formatJSONBlock(step.output)}
                                </pre>
                              </div>
                            )}
                            {formatJSONBlock(step.error) && (
                              <div>
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">Error</p>
                                <pre className="mt-2 overflow-x-auto rounded-lg bg-destructive/10 p-3 font-mono text-xs text-destructive">
                                  {formatJSONBlock(step.error)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <div className="mt-4 text-sm text-muted-foreground">
        Templates can still be managed from the
        {" "}
        <Link href="/dashboard/settings/templates" className="text-primary hover:underline">
          templates settings page
        </Link>
        , and definition JSON is the current builder source of truth.
      </div>
    </CardBox>
  );
};

export default WorkflowManagement;
import type {
  CreateWorkflowPayload,
  WorkflowExecutionDetail,
  WorkflowExecutionItem,
  WorkflowItem,
} from "@/app/types/workflow";

type WorkflowEventPayload = {
  event: string;
  subscriber_id?: string;
  data?: Record<string, unknown>;
};

type WorkflowRequestInit = Omit<RequestInit, "body"> & {
  body?: BodyInit | object;
};

const parseError = async (response: Response): Promise<string> => {
  const fallback = "Request failed";

  const text = await response.text().catch(() => "");
  if (!text) return fallback;

  try {
    const body = JSON.parse(text) as { error?: string; message?: string };
    return body.error || body.message || fallback;
  } catch {
    return text.trim() || fallback;
  }
};

const buildRequestInit = (init?: WorkflowRequestInit): RequestInit => {
  const headers = new Headers(init?.headers);
  const method = init?.method || "GET";
  const hasObjectBody =
    init?.body != null &&
    typeof init.body === "object" &&
    !(init.body instanceof FormData);

  if (method === "GET") {
    headers.set("browserrefreshed", "false");
  }

  if (hasObjectBody) {
    headers.set("Content-Type", "application/json");
  }

  return {
    ...init,
    headers,
    body: hasObjectBody
      ? JSON.stringify(init?.body)
      : (init?.body as BodyInit | undefined),
    cache: init?.cache ?? "no-store",
  };
};

async function request<T>(
  path: string,
  init?: WorkflowRequestInit,
): Promise<T> {
  const response = await fetch(path, buildRequestInit(init));

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const workflowApi = {
  archiveWorkflow(id: string) {
    return request<void>(`/api/workflows/${id}`, { method: "DELETE" });
  },
  createWorkflow(payload: CreateWorkflowPayload) {
    return request<WorkflowItem>("/api/workflows", {
      method: "POST",
      body: payload,
    });
  },
  getWorkflow(id: string) {
    return request<WorkflowItem>(`/api/workflows/${id}`, { method: "GET" });
  },
  getExecution(id: string) {
    return request<WorkflowExecutionDetail>(`/api/workflow-executions/${id}`, {
      method: "GET",
    });
  },
  getExecutions(workflowID?: string) {
    const search =
      workflowID && workflowID !== "all"
        ? `?workflow_id=${encodeURIComponent(workflowID)}`
        : "";

    return request<WorkflowExecutionItem[]>(
      `/api/workflow-executions${search}`,
      {
        method: "GET",
      },
    );
  },
  getWorkflows() {
    return request<WorkflowItem[]>("/api/workflows", { method: "GET" });
  },
  updateWorkflow(id: string, payload: CreateWorkflowPayload) {
    return request<WorkflowItem>(`/api/workflows/${id}`, {
      method: "PUT",
      body: payload,
    });
  },
  publishWorkflow(id: string) {
    return request<void>(`/api/workflows/${id}/publish`, { method: "POST" });
  },
  triggerEvent(payload: WorkflowEventPayload) {
    return request<void>("/api/events", {
      method: "POST",
      body: payload,
    });
  },
};

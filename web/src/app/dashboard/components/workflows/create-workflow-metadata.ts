import { z } from "zod";

export const workflowSetupSchema = z.object({
  key: z.string().trim().min(1, "Workflow key is required"),
  name: z.string().trim().min(1, "Workflow name is required"),
  description: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || ""),
});

export type WorkflowSetupValues = z.infer<typeof workflowSetupSchema>;

type SearchParamsReader = {
  get: (key: string) => string | null;
};

const firstSearchParamValue = (value: string | string[] | null | undefined) =>
  Array.isArray(value) ? value[0] || "" : value || "";

export const workflowSetupValuesFromSearchParams = (
  searchParams: SearchParamsReader,
): WorkflowSetupValues => ({
  key: searchParams.get("key") || "",
  name: searchParams.get("name") || "",
  description: searchParams.get("description") || "",
});

export const workflowSetupValuesFromRecord = (
  searchParams: Record<string, string | string[] | undefined>,
): WorkflowSetupValues => ({
  key: firstSearchParamValue(searchParams.key),
  name: firstSearchParamValue(searchParams.name),
  description: firstSearchParamValue(searchParams.description),
});

export const workflowIdFromRecord = (
  searchParams: Record<string, string | string[] | undefined>,
) => firstSearchParamValue(searchParams.workflowId);

export const workflowIdFromSearchParams = (searchParams: SearchParamsReader) =>
  searchParams.get("workflowId") || "";

export const buildWorkflowBuilderHref = (
  values?: Partial<WorkflowSetupValues> & { workflowId?: string },
) => {
  const params = new URLSearchParams();
  if (values?.workflowId?.trim()) {
    params.set("workflowId", values.workflowId.trim());
  }
  if (values?.key?.trim()) {
    params.set("key", values.key.trim());
  }
  if (values?.name?.trim()) {
    params.set("name", values.name.trim());
  }
  if (values?.description?.trim()) {
    params.set("description", values.description.trim());
  }

  const query = params.toString();
  return query
    ? `/dashboard/workflows/new/builder?${params.toString()}`
    : "/dashboard/workflows/new/builder";
};

export const buildWorkflowSetupHref = (
  values: Partial<WorkflowSetupValues>,
) => {
  const params = new URLSearchParams();
  if (values.key?.trim()) {
    params.set("key", values.key.trim());
  }
  if (values.name?.trim()) {
    params.set("name", values.name.trim());
  }
  if (values.description?.trim()) {
    params.set("description", values.description.trim());
  }

  const query = params.toString();
  return query
    ? `/dashboard/workflows/new?${query}`
    : "/dashboard/workflows/new";
};

export const buildWorkflowChannelConfigureHref = (
  workflowId: string,
  nodeId: string,
) => {
  const params = new URLSearchParams();
  params.set("workflowId", workflowId);
  params.set("nodeId", nodeId);

  return `/dashboard/workflows/new/builder/channel?${params.toString()}`;
};

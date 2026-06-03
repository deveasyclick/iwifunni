import type { WorkflowSetupValues } from '../schema/workflow-setup';

type SearchParamsReader = {
  get: (key: string) => string | null;
};

const firstSearchParamValue = (value: string | string[] | null | undefined) =>
  Array.isArray(value) ? value[0] || '' : value || '';

export const workflowSetupValuesFromSearchParams = (
  searchParams: SearchParamsReader,
): WorkflowSetupValues => ({
  key: searchParams.get('key') || '',
  name: searchParams.get('name') || '',
  description: searchParams.get('description') || '',
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
  searchParams.get('workflowId') || '';

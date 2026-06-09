export const buildSaveSignature = (
  definitionSignature: string,
  workflowName: string,
  workflowDescription: string,
): string =>
  JSON.stringify({
    definitionSignature,
    workflowName,
    workflowDescription,
  });

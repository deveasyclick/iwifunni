import type { VariableDefinition } from '../types/data-panel';

/**
 * Regex to match Maily's variable span in HTML output.
 * Maily's VariableExtension renders as:
 *   <span data-id="subscriber.firstName" data-label="First Name" data-required="false">First Name</span>
 */
const MAILY_VARIABLE_RE = /<span[^>]*data-id="([^"]*)"[^>]*>[^<]*<\/span>/g;

/**
 * Regex to match {{path}} template syntax.
 */
const TEMPLATE_VARIABLE_RE = /\{\{([^}]+)\}\}/g;

/**
 * Converts Maily's HTML variable format (`<span data-id="path">label</span>`)
 * back to `{{path}}` for backend persistence.
 *
 * Call this before saving editor HTML to the backend.
 */
export function mailyVariablesToText(html: string): string {
  return html.replace(
    MAILY_VARIABLE_RE,
    (_match: string, id: string): string => `{{${id}}}`,
  );
}

/**
 * Converts `{{path}}` template syntax to Maily's HTML variable format
 * (`<span data-id="path" data-required="false">label</span>`).
 *
 * Call this when loading HTML from the backend into the editor.
 *
 * @param html - HTML string that may contain {{path}} placeholders
 * @param variableDefinitions - list of VariableDefinition to look up labels
 */
export function textToMailyVariables(
  html: string,
  variableDefinitions: VariableDefinition[],
): string {
  const lookup = new Map(variableDefinitions.map((v) => [v.path, v.label]));

  return html.replace(
    TEMPLATE_VARIABLE_RE,
    (_match: string, path: string): string => {
      const label = lookup.get(path) || path;
      return `<span data-id="${path}" data-required="false">${label}</span>`;
    },
  );
}

/**
 * Replaces `{{path}}` placeholders in HTML with actual values from a context object.
 */
export function renderPreview(
  html: string,
  context: Record<string, unknown>,
): string {
  return html.replace(
    TEMPLATE_VARIABLE_RE,
    (_match: string, path: string): string => {
      const value = context[path];
      if (value === undefined || value === null || typeof value === 'object') {
        return `<strong>{{${path}}}</strong>`;
      }
      return String(value);
    },
  );
}

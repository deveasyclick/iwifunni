import type { VariableDefinition } from '../types/data-panel';

/**
 * Regex to match variable elements in Maily editor HTML output.
 *
 * Maily's VariableExtension.renderHTML produces:
 *   <div data-type="variable" data-id="subscriber.firstName" …>label</div>
 *
 * Our textToMailyVariables helper produces the same attributes during
 * editor load (but on a <span> instead of <div> for inline layout):
 *   <span data-type="variable" data-id="subscriber.firstName">label</span>
 *
 * Both carry:
 *   data-type="variable"  – tells Maily's VariableExtension this is a
 *                            variable node during ProseMirror HTML parsing
 *   data-id="path"         – stores the variable path (e.g.
 *                            "subscriber.firstName") so we can convert
 *                            back to {{subscriber.firstName}} on save
 */
const MAILY_VARIABLE_RE =
  /<(?:span|div)\b[^>]*\bdata-id="([^"]*)"[^>]*>[^<]*<\/(?:span|div)>/g;

/**
 * Regex to match {{path}} template syntax.
 */
const TEMPLATE_VARIABLE_RE = /\{\{([^}]+)\}\}/g;

/**
 * Converts Maily's HTML variable elements back to `{{path}}` for backend
 * persistence.  Handles both Maily's native format
 * (`<div data-type="variable" data-id="path">label</div>`) and the
 * equivalent `<span>` format (produced by textToMailyVariables).
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
 * Converts `{{path}}` template syntax to a variable element recognised by
 * Maily's VariableExtension. Uses an inline `<span>` element with
 * `data-type="variable"` so ProseMirror keeps it in-flow within a
 * paragraph, avoiding the paragraph-break that a block-level `<div>`
 * would cause.
 *
 * The attributes on the generated element:
 *   data-type="variable"  – tells Maily's VariableExtension this is a
 *                            variable node during ProseMirror HTML parsing
 *   data-id="path"         – stores the variable path (e.g.
 *                            "subscriber.firstName") so mailyVariablesToText
 *                            can convert back to {{subscriber.firstName}}
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
      return `<span data-type="variable" data-id="${path}">${label}</span>`;
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
      if (typeof value === 'string') {
        return value;
      }
      if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
      }
      return `<strong>{{${path}}}</strong>`;
    },
  );
}

/**
 * Resolves `{{path}}` placeholders in a string with values from a context
 * object. Unresolved placeholders are left as-is (unlike renderPreview which
 * wraps them in `<strong>` tags). This is suitable for email and SMS content
 * where raw template syntax should be preserved rather than highlighted.
 */
export function resolveTemplateVariables(
  text: string,
  context: Record<string, unknown>,
): string {
  return text.replace(
    TEMPLATE_VARIABLE_RE,
    (_match: string, path: string): string => {
      const value = context[path];
      if (typeof value === 'string') {
        return value;
      }
      if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
      }
      return _match;
    },
  );
}

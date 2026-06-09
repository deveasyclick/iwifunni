import { useCallback, useEffect, useMemo, useRef } from 'react';
import '@maily-to/core/style.css';
import {
  VariableExtension,
  getVariableSuggestions,
  type Variable,
} from '@maily-to/core/extensions';
import { textToMailyVariables } from './encode';
import { Editor as MailyEditor } from '@maily-to/core';

import { Editor } from '@tiptap/react';
import type { VariableDefinition } from '../types/data-panel';

/** Small inline chip for variables in the subject line. */
function SubjectChip({ variable }: Readonly<{ variable: Variable }>) {
  return (
    <span
      className="inline-flex items-center rounded-full border border-border/50 bg-muted/30 px-1 text-xs font-mono leading-none text-foreground/90 select-none"
      contentEditable={false}
    >
      {'{{'}
      {variable.name}
      {'}}'}
    </span>
  );
}

type Props = {
  value: string;
  onChange: (text: string) => void;
  variableDefinitions: VariableDefinition[];
};

/**
 * A single-line editor with variable chip support for email subject lines.
 */
export function SubjectEditor({
  value,
  onChange,
  variableDefinitions,
}: Readonly<Props>) {
  const onChangeRef = useRef(onChange);
  const defsRef = useRef(variableDefinitions);
  defsRef.current = variableDefinitions;

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const handleUpdate = useCallback((editor: Editor) => {
    const text = editor.getText();
    onChangeRef.current?.(text);
  }, []);

  // Convert {{path}} to Maily spans for editor rendering
  const initialHtml = useMemo(
    () => textToMailyVariables(value, variableDefinitions) || '<p></p>',
    [value, variableDefinitions],
  );

  const extensions = useMemo(() => {
    const ext = VariableExtension.configure({
      renderLabel: ({ node }) => `{{${node.attrs.id}}}`,
      renderVariable: ({ variable }) => <SubjectChip variable={variable} />,
      variables: ({ query }: { query: string }) => {
        const defs = defsRef.current;
        const all = defs.map((v) => ({
          name: v.path,
          id: v.path,
          label: `{{${v.path}}}`,
          required: false,
        }));
        if (!query) return all;
        const q = query.toLowerCase();
        return all.filter((v) => v.name.toLowerCase().includes(q));
      },
      suggestion: getVariableSuggestions('{'),
    });
    return [ext];
  }, []);

  return (
    <div className="overflow-hidden rounded-md border border-border/50">
      <MailyEditor
        contentHtml={initialHtml}
        onUpdate={handleUpdate}
        extensions={extensions}
        config={{
          hasMenuBar: false,
          hideContextMenu: true,
          spellCheck: false,
          contentClassName: 'py-0 px-0.5 text-sm leading-7 overflow-hidden',
          immediatelyRender: false,
          autofocus: false,
        }}
      />
    </div>
  );
}

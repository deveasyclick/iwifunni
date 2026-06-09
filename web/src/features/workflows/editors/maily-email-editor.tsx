'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  VariableExtension,
  getVariableSuggestions,
  type Variable,
} from '@maily-to/core/extensions';
import type { VariableDefinition } from '../types/data-panel';
import { type Editor } from '@tiptap/react';
import { Editor as MailyEditor } from '@maily-to/core';
import '@maily-to/core/style.css';

/**
 * Custom renderer for variable chips in the editor.
 * Shows `{{subscriber.firstName}}` instead of the default braces icon + label.
 */
function VariableChipView({ variable }: Readonly<{ variable: Variable }>) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-muted/30 px-1.5 py-0.5 text-xs font-mono leading-none text-foreground/90 select-none">
      {'{{'}
      {variable.name}
      {'}}'}
    </span>
  );
}

type Props = {
  initialValue?: string;
  onHtmlChange?: (html: string) => void;
  variableDefinitions?: VariableDefinition[];
};

const MailyEmailEditor = ({
  initialValue,
  onHtmlChange,
  variableDefinitions = [],
}: Props) => {
  const onHtmlChangeRef = useRef(onHtmlChange);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onHtmlChangeRef.current = onHtmlChange;
  }, [onHtmlChange]);

  const handleUpdate = useCallback((editor: Editor) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const html = editor.getHTML();
      onHtmlChangeRef.current?.(html);
    }, 400);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const variableDefsRef = useRef(variableDefinitions);
  variableDefsRef.current = variableDefinitions;

  // Build extensions once — the variables function reads from the ref so
  // suggestions stay up-to-date without recreating the extension.
  const extensions = useMemo(() => {
    const ext = VariableExtension.configure({
      renderLabel: ({ node }) => {
        return `{{${node.attrs.id}}}`;
      },
      renderVariable: ({ variable }) => (
        <VariableChipView variable={variable} />
      ),
      variables: ({ query }: { query: string }) => {
        const defs = variableDefsRef.current;
        const all: Array<{
          name: string;
          id: string;
          label: string;
          required: boolean;
        }> = defs.map((v) => ({
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
    <MailyEditor
      contentHtml={initialValue || '<p></p>'}
      onUpdate={handleUpdate}
      extensions={extensions}
      config={{
        hasMenuBar: false,
        hideContextMenu: false,
        spellCheck: false,
        contentClassName: 'min-h-[560px]',
        immediatelyRender: false,
        autofocus: false,
      }}
    />
  );
};

export default MailyEmailEditor;

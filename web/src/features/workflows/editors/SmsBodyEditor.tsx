import { Editor as MailyEditor } from '@maily-to/core';
import {
  PlaceholderExtension,
  SlashCommandExtension,
  VariableExtension,
  getVariableSuggestions,
} from '@maily-to/core/extensions';
import '@maily-to/core/style.css';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { VariableDefinition } from '../types/data-panel';
import { textToMailyVariables } from './encode';
import { SmsCharacterCounter } from './SmsCharacterCounter';
import { SmsSenderInfo } from './SmsSenderInfo';
import { VariableChip } from './VariableChip';

type Props = {
  readonly value: string;
  readonly onChange: (text: string) => void;
  readonly variableDefinitions: VariableDefinition[];
  readonly smsSenderId?: string;
  readonly smsHasProvider?: boolean;
};

/**
 * Self-contained SMS body editor widget.
 *
 * Renders the sender info card, a variable hint, the Maily plain-text
 * editor with `{{` autocomplete, and the live character counter.
 */
export function SmsBodyEditor({
  value,
  onChange,
  variableDefinitions,
  smsSenderId,
  smsHasProvider,
}: Readonly<Props>) {
  const onChangeRef = useRef(onChange);
  const defsRef = useRef(variableDefinitions);
  defsRef.current = variableDefinitions;

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const handleUpdate = useCallback((editor: { getText: () => string }) => {
    const text = editor.getText();
    onChangeRef.current?.(text);
  }, []);

  // Convert {{path}} → Maily spans for editor rendering
  const initialHtml = useMemo(
    () => textToMailyVariables(value, variableDefinitions) || '<p></p>',
    [value, variableDefinitions],
  );

  const extensions = useMemo(() => {
    // Variable extension — triggers on `{` to show {{path}} suggestions
    const variableExt = VariableExtension.configure({
      renderLabel: ({ node }) => `{{${node.attrs.id}}}`,
      renderVariable: ({ variable }) => (
        <VariableChip variable={variable} contentEditable />
      ),
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

    // Disable Maily's default `/` menu — prevent it from ever triggering.
    const disabledSlash = SlashCommandExtension.configure({
      suggestion: {
        char: '/',
        allow: () => false,
        items: () => [],
      },
    });

    // Override the placeholder — replace "Write something or / to see commands"
    // with empty string for a clean SMS body editor.
    const noPlaceholder = PlaceholderExtension.configure({
      placeholder: '',
      includeChildren: false,
    });

    return [variableExt, disabledSlash, noPlaceholder];
  }, []);

  return (
    <div className="space-y-2">
      <SmsSenderInfo
        smsSenderId={smsSenderId}
        smsHasProvider={smsHasProvider}
      />

      <p className="text-xs text-muted-foreground">
        Type{' '}
        <kbd className="rounded border border-border bg-muted px-1 font-mono text-[10px]">
          {'{'}
        </kbd>{' '}
        to insert template variables into the SMS body.
      </p>

      <div className="overflow-hidden rounded-md border border-border/50">
        <MailyEditor
          contentHtml={initialHtml}
          onUpdate={handleUpdate}
          extensions={extensions}
          config={{
            hasMenuBar: false,
            hideContextMenu: true,
            spellCheck: false,
            contentClassName:
              'py-2 px-3 text-sm leading-6 min-h-48 overflow-auto',
            immediatelyRender: false,
            autofocus: false,
          }}
        />
      </div>

      <SmsCharacterCounter body={value} />
    </div>
  );
}

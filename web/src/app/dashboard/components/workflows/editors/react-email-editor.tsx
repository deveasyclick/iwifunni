'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import EmailEditor, { type EditorRef } from 'react-email-editor';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Plus } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { encodeEmailBody, decodeEmailBody } from './encode';
import { makeRow, makeTextContent } from './blocks/factories';
import { BLOCK_DEFINITIONS } from './blocks/definitions';
import type { BlockDef } from './blocks/definitions';

// ─── Types ─────────────────────────────────────────────────────────────────

export type ReactEmailEditorHandle = {
  getEncodedBody: () => Promise<string>;
};

type Props = {
  initialValue?: string;
  onHtmlChange?: (html: string) => void;
  onEncodedBodyChange?: (encodedBody: string) => void;
};

// ─── Component ─────────────────────────────────────────────────────────────

const ReactEmailEditor = forwardRef<ReactEmailEditorHandle, Props>(
  ({ initialValue, onHtmlChange, onEncodedBodyChange }, ref) => {
    const { resolvedTheme } = useTheme();
    const editorRef = useRef<EditorRef>(null);
    const onHtmlChangeRef = useRef(onHtmlChange);
    const onEncodedBodyChangeRef = useRef(onEncodedBodyChange);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
      onHtmlChangeRef.current = onHtmlChange;
    }, [onHtmlChange]);

    useEffect(() => {
      onEncodedBodyChangeRef.current = onEncodedBodyChange;
    }, [onEncodedBodyChange]);

    useImperativeHandle(ref, () => ({
      getEncodedBody: () =>
        new Promise((resolve, reject) => {
          const editor = editorRef.current?.editor;
          if (!editor) {
            reject(new Error('Editor not ready'));
            return;
          }
          editor.exportHtml(({ design, html }) => {
            resolve(encodeEmailBody(design, html));
          });
        }),
    }));

    const handleReady = useCallback(() => {
      const editor = editorRef.current?.editor;
      if (!editor) return;

      if (initialValue) {
        const decoded = decodeEmailBody(initialValue);
        if (decoded) {
          editor.loadDesign(
            decoded.design as Parameters<typeof editor.loadDesign>[0],
          );
        }
      } else {
        editor.loadDesign({
          body: {
            rows: [
              makeRow([makeTextContent('Start typing your message here.')]),
            ],
          },
        } as Parameters<typeof editor.loadDesign>[0]);
      }

      editor.addEventListener('design:updated', () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          editor.exportHtml(({ design, html }) => {
            onHtmlChangeRef.current?.(html);
            onEncodedBodyChangeRef.current?.(encodeEmailBody(design, html));
          });
        }, 800);
      });
    }, [initialValue]);

    const insertBlock = useCallback((def: BlockDef) => {
      const editor = editorRef.current?.editor;
      if (!editor) return;

      editor.saveDesign((design) => {
        const d = design as { body?: { rows?: object[] } };
        const rows: object[] = d.body?.rows ?? [];
        const newRow = def.build();
        const updated = {
          ...d,
          body: { ...(d.body ?? {}), rows: [...rows, newRow] },
        };
        editor.loadDesign(updated as Parameters<typeof editor.loadDesign>[0]);
      });
    }, []);

    const projectId = process.env.NEXT_PUBLIC_UNLAYER_PROJECT_ID
      ? Number(process.env.NEXT_PUBLIC_UNLAYER_PROJECT_ID)
      : undefined;

    const groups = [...new Set(BLOCK_DEFINITIONS.map((b) => b.group))];

    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Add block
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {groups.map((group, gi) => (
                <div key={group}>
                  {gi > 0 && <DropdownMenuSeparator />}
                  <DropdownMenuLabel className="text-xs">
                    {group}
                  </DropdownMenuLabel>
                  {BLOCK_DEFINITIONS.filter((b) => b.group === group).map(
                    (def) => (
                      <DropdownMenuItem
                        key={def.label}
                        onSelect={() => insertBlock(def)}
                      >
                        {def.label}
                      </DropdownMenuItem>
                    ),
                  )}
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="overflow-hidden rounded-xl border border-border/50">
          <EmailEditor
            ref={editorRef}
            onReady={handleReady}
            projectId={projectId}
            minHeight={560}
            options={{
              displayMode: 'email',
              features: { stockImages: false },
              appearance: {
                theme: resolvedTheme === 'dark' ? 'dark' : 'light',
              },
              mergeTags: {
                subscriber: {
                  name: 'Subscriber',
                  mergeTags: {
                    firstName: {
                      name: 'First Name',
                      value: '{{subscriber.firstName}}',
                    },
                    lastName: {
                      name: 'Last Name',
                      value: '{{subscriber.lastName}}',
                    },
                    email: { name: 'Email', value: '{{subscriber.email}}' },
                    id: { name: 'Subscriber ID', value: '{{subscriber.id}}' },
                  },
                },
                workflow: {
                  name: 'Workflow',
                  mergeTags: {
                    name: { name: 'Workflow Name', value: '{{workflow.name}}' },
                    eventData: {
                      name: 'Event Data',
                      value: '{{workflow.eventData}}',
                    },
                  },
                },
              },
            }}
          />
        </div>
      </div>
    );
  },
);

ReactEmailEditor.displayName = 'ReactEmailEditor';

export default ReactEmailEditor;

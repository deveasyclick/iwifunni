'use client';

import { useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import type { Editor as TiptapEditor } from '@tiptap/core';
import '@maily-to/core/style.css';
import { render } from '@maily-to/render';

const MailyEditor = dynamic(
  () => import('@maily-to/core').then((mod) => mod.Editor),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-140 items-center justify-center rounded-xl border border-border/50">
        <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading email editor…</span>
        </div>
      </div>
    ),
  },
);

type Props = {
  initialValue?: string;
  onHtmlChange?: (html: string) => void;
};

const MailyEmailEditor = ({ initialValue, onHtmlChange }: Props) => {
  const onHtmlChangeRef = useRef(onHtmlChange);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onHtmlChangeRef.current = onHtmlChange;
  }, [onHtmlChange]);

  const handleUpdate = useCallback((editor: TiptapEditor) => {
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

  return (
    <MailyEditor
      contentHtml={initialValue || '<p></p>'}
      onCreate={handleUpdate}
      onUpdate={handleUpdate}
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

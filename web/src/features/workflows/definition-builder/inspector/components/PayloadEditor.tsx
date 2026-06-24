'use client';

import { useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import ReactJson from 'react-json-view';

interface PayloadEditorProps {
  readonly payload: Record<string, unknown>;
  readonly onChange: (value: Record<string, unknown>) => void;
  readonly onReset: () => void;
}

export function PayloadEditor({
  payload,
  onChange,
  onReset,
}: PayloadEditorProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleStartEdit = () => {
    setDraft(JSON.stringify(payload, null, 2) || '{}');
    setError(null);
    setEditing(true);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const handleSave = () => {
    try {
      const parsed = JSON.parse(draft);
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        setError('Payload must be a JSON object');
        return;
      }
      const cleaned: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        if (
          typeof v === 'string' ||
          typeof v === 'number' ||
          typeof v === 'boolean'
        ) {
          cleaned[k] = `${v}`;
        }
      }
      onChange(cleaned);
      onReset();
      setEditing(false);
      setError(null);
    } catch {
      setError('Invalid JSON');
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setError(null);
  };

  return (
    <div className="space-y-2">
      <Label>
        Payload{' '}
        <span className="text-xs text-muted-foreground">
          (template variables)
        </span>
      </Label>

      {editing ? (
        <div className="space-y-2">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setError(null);
            }}
            className="min-h-[120px] w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs"
            spellCheck={false}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex items-center gap-1 justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSave}
              className="h-6 w-6 p-0 text-primary hover:text-primary/80"
              title="Save"
            >
              <Icon icon="tabler:check" className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              title="Cancel"
            >
              <Icon icon="tabler:x" className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="relative rounded-md border border-border overflow-hidden">
          <div className="absolute top-1 right-1 z-10">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleStartEdit}
              className="h-6 w-6 p-0 bg-background/80 text-muted-foreground hover:text-foreground hover:bg-accent/80 backdrop-blur-sm"
              title="Edit payload"
            >
              <Icon icon="tabler:pencil" className="h-3.5 w-3.5" />
            </Button>
          </div>
          <ReactJson
            src={payload}
            name={false}
            collapsed={false}
            displayDataTypes={false}
            displayObjectSize={false}
            enableClipboard={false}
            iconStyle="triangle"
            indentWidth={2}
            style={{
              padding: '12px',
              fontSize: '12px',
              fontFamily:
                'ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, monospace',
              lineHeight: '1.5',
            }}
          />
        </div>
      )}
    </div>
  );
}

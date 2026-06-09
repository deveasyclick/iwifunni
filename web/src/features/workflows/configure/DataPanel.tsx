'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Loader2,
  AlertCircle,
  ChevronRight,
  User,
  Package,
} from 'lucide-react';
import { PreviewSubscriberSelector } from './PreviewSubscriberSelector';
import type { DataPanelProps } from '../types/data-panel';

/**
 * Formats an object as a colorized object literal like:
 *   {
 *     firstName: "Yusuf",
 *     email:     "yusuf@..."
 *   }
 */
function colorizeObject(data: Record<string, unknown>): string {
  const entries = Object.entries(data).filter(
    ([, v]) => v !== undefined && v !== null,
  );
  if (entries.length === 0) return '{ }';

  const maxKeyLen = Math.max(...entries.map(([k]) => k.length));
  const lines = entries.map(([key, value]) => {
    const val =
      typeof value === 'string'
        ? `<span style="color:#16a34a">"${value}"</span>`
        : `<span style="color:#d97706">${String(value)}</span>`;
    return `  ${key.padEnd(maxKeyLen)}: ${val}`;
  });

  return `{\n${lines.join(',\n')}\n}`;
}

/**
 * Renders a colorized object literal via dangerouslySetInnerHTML.
 */
function ObjectPreview({ data }: Readonly<{ data: Record<string, unknown> }>) {
  const html = useMemo(() => colorizeObject(data), [data]);

  return (
    <pre
      className="max-h-48 overflow-y-auto rounded-md bg-muted/50 p-3 text-xs font-mono whitespace-pre-wrap break-all"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * DataPanel — the left column that shows an editable payload JSON editor
 * and the preview subscriber data as colorized JSON.
 */
export const DataPanel = ({
  workflowId: _workflowId,
  payload,
  onPayloadChange,
  previewSubscriber,
  subscriberLoading = false,
  subscriberError = null,
  onSelectSubscriber,
  onResetSubscriber,
}: DataPanelProps) => {
  // Build subscriber object (no metadata)
  const subscriberData = useMemo(() => {
    if (!previewSubscriber) return null;
    const obj: Record<string, unknown> = {
      id: previewSubscriber.id,
    };
    if (previewSubscriber.firstName)
      obj.firstName = previewSubscriber.firstName;
    if (previewSubscriber.lastName) obj.lastName = previewSubscriber.lastName;
    if (previewSubscriber.email) obj.email = previewSubscriber.email;
    if (previewSubscriber.phone) obj.phone = previewSubscriber.phone;
    return obj;
  }, [previewSubscriber]);

  const [payloadError, setPayloadError] = useState<string | null>(null);
  const [payloadLocal, setPayloadLocal] = useState(payload);

  // Sync from parent
  useEffect(() => {
    setPayloadLocal(payload);
  }, [payload]);

  const handlePayloadChange = useCallback(
    (value: string) => {
      setPayloadLocal(value);
      try {
        JSON.parse(value);
        setPayloadError(null);
        onPayloadChange(value);
      } catch {
        setPayloadError('Invalid JSON');
      }
    },
    [onPayloadChange],
  );

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Preview subscriber selector */}
      <PreviewSubscriberSelector
        previewSubscriber={previewSubscriber ?? null}
        onSelect={onSelectSubscriber || (() => {})}
        onReset={onResetSubscriber || (() => {})}
        hasDefault={true}
      />

      {/* Payload (editable JSON) — on top */}
      <Collapsible defaultOpen className="group">
        <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-accent/50 transition-colors">
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
          <Package className="h-3.5 w-3.5 text-muted-foreground" />
          Payload
          {payloadError && (
            <span className="ml-auto text-[10px] text-destructive">
              Invalid JSON
            </span>
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <div className="relative rounded-md border border-border/50 bg-[#1e1e2e]">
            <div className="flex">
              <div className="select-none py-3 pl-3 pr-2 text-right text-[13px] leading-relaxed text-[#585b70] font-mono">
                {payloadLocal.split('\n').map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
              <textarea
                value={payloadLocal}
                onChange={(e) => handlePayloadChange(e.target.value)}
                className={`min-h-32 w-full resize-y border-0 bg-transparent p-3 pl-2 font-mono text-[13px] leading-relaxed text-[#cdd6f4] placeholder-[#585b70] caret-[#f5e0dc] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/30 ${
                  payloadError ? 'ring-1 ring-destructive/50' : ''
                }`}
                placeholder='{&#10;  "event": "order.created"&#10;}'
                spellCheck={false}
              />
            </div>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Define test payload values. Type{' '}
            <code className="rounded bg-muted px-1 font-mono text-[10px]">
              {'{{'}
            </code>{' '}
            in the editor to insert variables.
          </p>
        </CollapsibleContent>
      </Collapsible>

      {/* Subscriber Data (read-only object view) — on bottom */}
      <Collapsible defaultOpen className="group">
        <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-accent/50 transition-colors">
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
          <User className="h-3.5 w-3.5 text-muted-foreground" />
          Subscriber
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          {subscriberLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : subscriberError ? (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertCircle className="h-3 w-3 shrink-0" />
              {subscriberError}
            </div>
          ) : subscriberData ? (
            <ObjectPreview data={subscriberData} />
          ) : (
            <span className="text-xs text-muted-foreground italic">
              No subscriber data
            </span>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

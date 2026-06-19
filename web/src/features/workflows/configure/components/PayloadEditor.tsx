import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { ChevronRight, Package } from 'lucide-react';

interface PayloadEditorProps {
  value: string;
  error: string | null;
  onChange: (value: string) => void;
}

function PayloadErrorBadge() {
  return (
    <span className="ml-auto text-[10px] text-destructive">Invalid JSON</span>
  );
}

function PayloadTextarea({
  value,
  error,
  onChange,
}: Readonly<{
  value: string;
  error: string | null;
  onChange: (value: string) => void;
}>) {
  return (
    <div className="relative rounded-md border border-border/50 bg-[#1e1e2e]">
      <div className="flex">
        <div className="select-none py-3 pl-3 pr-2 text-right text-[13px] leading-relaxed text-[#585b70] font-mono">
          {value.split('\n').map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'min-h-32 w-full resize-y border-0 bg-transparent p-3 pl-2 font-mono text-[13px] leading-relaxed text-[#cdd6f4] placeholder-[#585b70] caret-[#f5e0dc] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/30',
            error && 'ring-1 ring-destructive/50',
          )}
          placeholder='{&#10;  "event": "order.created"&#10;}'
          spellCheck={false}
        />
      </div>
    </div>
  );
}

/**
 * Collapsible JSON payload editor with line numbers and validation.
 */
export function PayloadEditor({
  value,
  error,
  onChange,
}: Readonly<PayloadEditorProps>) {
  return (
    <Collapsible defaultOpen className="group">
      <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-accent/50 transition-colors">
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
        <Package className="h-3.5 w-3.5 text-muted-foreground" />
        Payload
        {error && <PayloadErrorBadge />}
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <PayloadTextarea value={value} error={error} onChange={onChange} />
        <p className="mt-1 text-[10px] text-muted-foreground">
          Define test payload values. Type{' '}
          <code className="rounded bg-muted px-1 font-mono text-[10px]">
            {'{{'}
          </code>{' '}
          in the editor to insert variables.
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}

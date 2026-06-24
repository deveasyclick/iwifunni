'use client';

import { useState } from 'react';
import { Icon } from '@iconify/react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import ReactJson from 'react-json-view';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ChevronRight, User } from 'lucide-react';
import type { PreviewSubscriber } from '@/features/workflows/types/data-panel';

interface SubscriberInfoEditorProps {
  readonly subscriber: PreviewSubscriber;
  readonly userEmail?: string;
  readonly onChange: (sub: PreviewSubscriber) => void;
  readonly onReset: () => void;
}

export function SubscriberInfoEditor({
  subscriber,
  userEmail,
  onChange,
  onReset,
}: SubscriberInfoEditorProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(subscriber);

  const handleStartEdit = () => {
    setDraft({ ...subscriber });
    setEditing(true);
  };

  const handleSave = () => {
    onChange(draft);
    onReset();
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft({ ...subscriber });
    setEditing(false);
  };

  const label =
    subscriber.firstName || subscriber.lastName
      ? `${subscriber.firstName || ''} ${subscriber.lastName || ''}`.trim()
      : subscriber.email || subscriber.phone || 'Selected subscriber';

  const badge = (() => {
    if (!subscriber.email) return '';
    if (subscriber.email === userEmail) return 'you';
    return 'overridden';
  })();

  return (
    <Collapsible defaultOpen className="group">
      <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-accent/50 transition-colors">
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
        <User className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="flex-1 text-left truncate">{label}</span>
        {badge && (
          <span className="text-xs text-muted-foreground">{badge}</span>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-3">
        {editing ? (
          <div className="rounded-md border border-border p-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  First name
                </Label>
                <input
                  value={draft.firstName || ''}
                  onChange={(e) =>
                    setDraft({ ...draft, firstName: e.target.value })
                  }
                  className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                  placeholder="First name"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Last name
                </Label>
                <input
                  value={draft.lastName || ''}
                  onChange={(e) =>
                    setDraft({ ...draft, lastName: e.target.value })
                  }
                  className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                  placeholder="Last name"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <input
                value={draft.email || ''}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Phone</Label>
              <input
                value={draft.phone || ''}
                onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                placeholder="+1234567890"
              />
            </div>
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
                title="Edit subscriber"
              >
                <Icon icon="tabler:pencil" className="h-3.5 w-3.5" />
              </Button>
            </div>
            <ReactJson
              src={{
                id: subscriber.id,
                ...(subscriber.firstName && {
                  firstName: subscriber.firstName,
                }),
                ...(subscriber.lastName && {
                  lastName: subscriber.lastName,
                }),
                ...(subscriber.email && { email: subscriber.email }),
                ...(subscriber.phone && { phone: subscriber.phone }),
              }}
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
      </CollapsibleContent>
    </Collapsible>
  );
}

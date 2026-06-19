'use client';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { AlertCircle, ChevronRight, Loader2, User } from 'lucide-react';
import { useMemo } from 'react';
import type { DataPanelProps } from '../types/data-panel';
import { ObjectPreview } from './components/ObjectPreview';
import { PayloadEditor } from './components/PayloadEditor';
import { SubscriberSearch } from './components/SubscriberSearch';
import { usePayloadEditor } from './hooks/use-payload-editor';
import { useSubscriberSearchInput } from './hooks/use-subscriber-search-input';

function buildSubscriberData(
  previewSubscriber: NonNullable<DataPanelProps['previewSubscriber']>,
): Record<string, unknown> {
  const obj: Record<string, unknown> = {
    id: previewSubscriber.id,
  };
  if (previewSubscriber.firstName) obj.firstName = previewSubscriber.firstName;
  if (previewSubscriber.lastName) obj.lastName = previewSubscriber.lastName;
  if (previewSubscriber.email) obj.email = previewSubscriber.email;
  if (previewSubscriber.phone) obj.phone = previewSubscriber.phone;
  return obj;
}

function SubscriberLoadingState() {
  return (
    <div className="flex items-center justify-center py-4">
      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
    </div>
  );
}

function SubscriberErrorState({ message }: Readonly<{ message: string }>) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
      <AlertCircle className="h-3 w-3 shrink-0" />
      {message}
    </div>
  );
}

function SubscriberEmptyState() {
  return (
    <span className="text-xs text-muted-foreground italic">
      Select a subscriber to preview data
    </span>
  );
}

function SubscriberDataPreview({
  subscriberData,
}: Readonly<{ subscriberData: Record<string, unknown> }>) {
  return <ObjectPreview data={subscriberData} />;
}

function SubscriberSection({
  subscriberLoading,
  subscriberError,
  subscriberData,
}: {
  subscriberLoading: boolean;
  subscriberError: string | null;
  subscriberData: Record<string, unknown> | null;
}) {
  if (subscriberLoading) {
    return <SubscriberLoadingState />;
  }

  if (subscriberError) {
    return <SubscriberErrorState message={subscriberError} />;
  }

  if (subscriberData) {
    return <SubscriberDataPreview subscriberData={subscriberData} />;
  }

  return <SubscriberEmptyState />;
}

function ResetButton({ onClick }: Readonly<{ onClick: () => void }>) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="text-xs font-normal text-primary hover:text-primary/80 transition-colors"
    >
      Reset to me
    </button>
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
  const { payloadLocal, payloadError, handlePayloadChange } = usePayloadEditor(
    payload,
    onPayloadChange,
  );

  const {
    searchQuery,
    setSearchQuery,
    isSearching,
    searchResults,
    clearSearch,
  } = useSubscriberSearchInput();

  const subscriberData = useMemo(() => {
    if (!previewSubscriber) return null;
    return buildSubscriberData(previewSubscriber);
  }, [previewSubscriber]);

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Payload (editable JSON) — on top */}
      <PayloadEditor
        value={payloadLocal}
        error={payloadError}
        onChange={handlePayloadChange}
      />

      {/* Subscriber Data (selector + read-only object view) */}
      <Collapsible defaultOpen className="group">
        <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-accent/50 transition-colors">
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
          <User className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="flex-1 text-left">Subscriber</span>
          {onResetSubscriber && previewSubscriber && (
            <ResetButton onClick={onResetSubscriber} />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-3">
          <SubscriberSearch
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            isSearching={isSearching}
            searchResults={searchResults}
            previewSubscriberId={previewSubscriber?.id}
            onSelect={(sub) => {
              onSelectSubscriber?.(sub);
              clearSearch();
            }}
            onClear={clearSearch}
          />

          <SubscriberSection
            subscriberLoading={subscriberLoading}
            subscriberError={subscriberError}
            subscriberData={subscriberData}
          />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { PreviewSubscriber } from '@/features/workflows/types/data-panel';
import { cn } from '@/lib/utils';
import { Loader2, Search } from 'lucide-react';

interface SubscriberSearchItem {
  id: string;
  name?: string;
  email?: string | null;
  phone?: string | null;
}

interface SubscriberSearchProps {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  isSearching: boolean;
  searchResults: SubscriberSearchItem[];
  previewSubscriberId?: string;
  onSelect: (subscriber: PreviewSubscriber) => void;
  onClear: () => void;
}

function toPreviewSubscriber(s: SubscriberSearchItem): PreviewSubscriber {
  return {
    id: s.id,
    firstName: s.name?.split(' ')[0] || s.name || '',
    lastName: s.name?.split(' ').slice(1).join(' ') || '',
    email: s.email ?? undefined,
    phone: s.phone ?? undefined,
  };
}

function SearchingState() {
  return (
    <div className="flex items-center justify-center py-4">
      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="px-3 py-4 text-center text-xs text-muted-foreground">
      No subscribers found
    </div>
  );
}

function ResultsList({
  results,
  previewSubscriberId,
  onSelect,
}: Readonly<{
  results: SubscriberSearchItem[];
  previewSubscriberId?: string;
  onSelect: (sub: PreviewSubscriber) => void;
}>) {
  return (
    <div className="p-1">
      {results.map((sub) => {
        const isSelected = previewSubscriberId === sub.id;
        return (
          <button
            key={sub.id}
            type="button"
            onClick={() => onSelect(toPreviewSubscriber(sub))}
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent/50',
              isSelected && 'bg-accent/30',
            )}
          >
            <span className="flex-1 truncate">
              <span className="font-medium">{sub.name || 'Unknown'}</span>
              {sub.email && (
                <span className="ml-2 text-xs text-muted-foreground">
                  {sub.email}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function SearchResults({
  isSearching,
  results,
  previewSubscriberId,
  onSelect,
}: Readonly<{
  isSearching: boolean;
  results: SubscriberSearchItem[];
  previewSubscriberId?: string;
  onSelect: (sub: PreviewSubscriber) => void;
}>) {
  if (isSearching) {
    return <SearchingState />;
  }

  if (results.length > 0) {
    return (
      <ResultsList
        results={results}
        previewSubscriberId={previewSubscriberId}
        onSelect={onSelect}
      />
    );
  }

  return <EmptyState />;
}

/**
 * Inline subscriber search input with results list.
 * Shows a search field and displays results below when there's a query.
 */
export function SubscriberSearch({
  searchQuery,
  onSearchQueryChange,
  isSearching,
  searchResults,
  previewSubscriberId,
  onSelect,
  onClear,
}: Readonly<SubscriberSearchProps>) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={searchQuery}
        onChange={(e) => onSearchQueryChange(e.target.value)}
        placeholder="Search subscribers…"
        className="h-9 pl-9 text-sm"
      />
      {searchQuery && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          Clear
        </Button>
      )}

      {searchQuery && (
        <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-border/50 bg-card">
          <SearchResults
            isSearching={isSearching}
            results={searchResults}
            previewSubscriberId={previewSubscriberId}
            onSelect={onSelect}
          />
        </div>
      )}
    </div>
  );
}

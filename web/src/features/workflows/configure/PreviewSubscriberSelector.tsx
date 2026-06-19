'use client';

import { Input } from '@/components/ui/input';
import { useSubscriberSearch } from '@/features/subscribers/queries';
import { Search, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PreviewSubscriber } from '../types/data-panel';

interface PreviewSubscriberSelectorProps {
  readonly previewSubscriber: PreviewSubscriber | null;
  readonly onSelect: (subscriber: PreviewSubscriber) => void;
  readonly onReset: () => void;
  readonly hasDefault: boolean;
}

const toPreviewSubscriber = (s: {
  id: string;
  name?: string;
  email?: string | null;
  phone?: string | null;
}): PreviewSubscriber => ({
  id: s.id,
  firstName: s.name?.split(' ')[0] || s.name || '',
  lastName: s.name?.split(' ').slice(1).join(' ') || '',
  email: s.email ?? undefined,
  phone: s.phone ?? undefined,
});

export const PreviewSubscriberSelector = ({
  previewSubscriber,
  onSelect,
  onReset,
  hasDefault,
}: PreviewSubscriberSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: results = [], isFetching: searching } =
    useSubscriberSearch(debouncedQuery);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = useCallback(
    (subscriber: PreviewSubscriber) => {
      onSelect(subscriber);
      setOpen(false);
      setQuery('');
    },
    [onSelect],
  );

  const toggleOpen = useCallback(() => {
    setOpen((prev) => !prev);
    if (!open) setQuery('');
  }, [open]);

  const previewResults = results.map(toPreviewSubscriber);

  // Dropdown content
  let dropdownContent: React.ReactNode;
  if (searching) {
    dropdownContent = (
      <div className="px-3 py-4 text-center text-xs text-muted-foreground">
        Searching…
      </div>
    );
  } else if (previewResults.length > 0) {
    dropdownContent = previewResults.map((sub) => (
      <button
        key={sub.id}
        type="button"
        onClick={() => handleSelect(sub)}
        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent/50 transition-colors"
      >
        <span className="flex-1 truncate">
          <span className="font-medium">
            {sub.firstName} {sub.lastName}
          </span>
          {sub.email && (
            <span className="ml-2 text-xs text-muted-foreground">
              {sub.email}
            </span>
          )}
        </span>
      </button>
    ));
  } else if (query.trim()) {
    dropdownContent = (
      <div className="px-3 py-4 text-center text-xs text-muted-foreground">
        No subscribers found
      </div>
    );
  } else {
    dropdownContent = (
      <div className="px-3 py-4 text-center text-xs text-muted-foreground">
        Start typing to search
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Preview Subscriber
        </span>
        {hasDefault && previewSubscriber && (
          <button
            type="button"
            onClick={onReset}
            className="text-xs text-primary hover:text-primary/80 transition-colors"
          >
            Reset to me
          </button>
        )}
      </div>

      {/* Current selection or trigger */}
      <button
        type="button"
        onClick={toggleOpen}
        className="flex w-full items-center gap-2 rounded-md border border-border/50 bg-card px-3 py-2 text-left text-sm hover:bg-accent/50 transition-colors"
      >
        {previewSubscriber ? (
          <>
            <span className="flex-1 truncate">
              <span className="font-medium">
                {previewSubscriber.firstName} {previewSubscriber.lastName}
              </span>
              {previewSubscriber.email && (
                <span className="ml-2 text-muted-foreground">
                  {previewSubscriber.email}
                </span>
              )}
            </span>
            <span className="shrink-0 text-muted-foreground">
              <Search className="h-3.5 w-3.5" />
            </span>
          </>
        ) : (
          <span className="flex-1 text-muted-foreground">
            Select preview subscriber…
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-border/50 bg-card shadow-lg">
          <div className="relative p-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search subscribers…"
              className="h-8 pl-8 text-sm"
              autoFocus
            />
            <Search className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="max-h-48 overflow-y-auto px-1 pb-1">
            {dropdownContent}
          </div>
        </div>
      )}
    </div>
  );
};

import { useEffect, useState } from 'react';
import { useSubscriberSearch } from '@/features/subscribers/queries';
import type { UseSubscriberSearchInputReturn } from '@/features/workflows/types/data-panel';

/**
 * Manages a debounced subscriber search input.
 * Returns the search state, results, and a clear handler.
 */
export function useSubscriberSearchInput(): UseSubscriberSearchInputReturn {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: searchResults = [], isFetching: isSearching } =
    useSubscriberSearch(debouncedQuery);

  const clearSearch = () => {
    setSearchQuery('');
    setDebouncedQuery('');
  };

  return {
    searchQuery,
    setSearchQuery,
    debouncedQuery,
    searchResults,
    isSearching,
    clearSearch,
  };
}


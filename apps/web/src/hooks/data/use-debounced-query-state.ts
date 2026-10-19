import { useDebouncedValue } from '@tanstack/react-pacer';
import { parseAsString, useQueryState } from 'nuqs';

/**
 * useDebouncedQueryState: Custom hook to manage a debounced search query state synchronized with the URL.
 * - Synchronize search query with URL for shareable and bookmarkable state
 * - Debounce search input to optimize performance and reduce unnecessary queries
 *
 * @example
 * ```
 * const { search, setSearch } = useDebouncedQueryState();
 * ```
 * @returns An object containing the debounced search query and a setter function to update the search query.
 */
export function useDebouncedQueryState(searchKey = 'search', defaultValue = '') {
  const [searchQuery, setSearchQuery] = useQueryState(searchKey, parseAsString.withDefault(defaultValue));
  const [debouncedSearch] = useDebouncedValue(searchQuery, { wait: 300 });

  return {
    search: searchQuery,
    debouncedSearch,
    setSearch: setSearchQuery,
  };
}

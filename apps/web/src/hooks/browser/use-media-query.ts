import { useCallback, useSyncExternalStore } from 'react';

/**
 * Reads the current match on the first client render so layouts never paint a stale breakpoint.
 * Server and hydration pass use `false`, and React re-reads the real value before paint.
 * @param query - The media query string (e.g., '(max-width: 768px)')
 * @returns boolean - Whether the media query matches
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onMediaQueryChange: () => unknown) => {
      const mediaQuery = window.matchMedia(query);
      mediaQuery.addEventListener('change', onMediaQueryChange);
      return () => {
        mediaQuery.removeEventListener('change', onMediaQueryChange);
      };
    },
    [query],
  );

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);
  const getServerSnapshot = useCallback(() => false, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

import { useQueryClient } from '@tanstack/react-query';
import type { FetchQueryOptions } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';

export function usePrefetchOnHover({ queryOptions }: { queryOptions: () => FetchQueryOptions }) {
  const hasPrefetched = useRef(false);
  const queryClient = useQueryClient();

  return useCallback(() => {
    if (hasPrefetched.current) return;
    const options = queryOptions();
    void queryClient.prefetchQuery(options);
    hasPrefetched.current = true;
  }, [queryClient, queryOptions]);
}

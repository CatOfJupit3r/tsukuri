import { useQueryClient } from '@tanstack/react-query';
import type { FetchQueryOptions } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';

import { reportDetachedError } from '#~/utils/report-detached-error';

interface iUsePrefetchOnHoverOptions {
  queryOptions: () => FetchQueryOptions;
}

export function usePrefetchOnHover({ queryOptions }: iUsePrefetchOnHoverOptions) {
  const hasPrefetched = useRef(false);
  const queryClient = useQueryClient();

  return useCallback(() => {
    if (hasPrefetched.current) return;
    const options = queryOptions();
    void queryClient.prefetchQuery(options).catch(reportDetachedError);
    hasPrefetched.current = true;
  }, [queryClient, queryOptions]);
}

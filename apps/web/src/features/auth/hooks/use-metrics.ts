import { useQuery } from '@tanstack/react-query';

import { tanstackRPC } from '#~/utils/tanstack-orpc';

export function useMetrics() {
  return useQuery(tanstackRPC.auth.metrics.queryOptions());
}

export type UseMetricsType = ReturnType<typeof useMetrics>;

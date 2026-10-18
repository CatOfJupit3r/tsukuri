import { QueryCache, QueryClient } from '@tanstack/react-query';

import { INTERVALS } from '#~/constants/dates';

const CLIENT_ERROR_STATUS_MIN = 400;
const CLIENT_ERROR_STATUS_MAX = 499;
const MAX_QUERY_RETRIES = 2;
const MAX_MUTATION_RETRIES = 1;
const RETRY_DELAY_MS = 1000;

/** 4xx responses mean the request itself is wrong, so repeating it cannot help. */
function isClientError(error: unknown) {
  if (!(error instanceof Error) || !('status' in error) || typeof error.status !== 'number') return false;
  return error.status >= CLIENT_ERROR_STATUS_MIN && error.status <= CLIENT_ERROR_STATUS_MAX;
}

export function shouldRetryQuery(failureCount: number, error: unknown) {
  return !isClientError(error) && failureCount < MAX_QUERY_RETRIES;
}

export function shouldRetryMutation(failureCount: number, error: unknown) {
  return !isClientError(error) && failureCount < MAX_MUTATION_RETRIES;
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: INTERVALS.FIVE_MINUTES,
        retry: shouldRetryQuery,
        retryDelay: RETRY_DELAY_MS,
        refetchInterval: INTERVALS.THIRTY_MINUTES,
      },
      mutations: {
        retry: shouldRetryMutation,
        retryDelay: RETRY_DELAY_MS,
      },
    },
    queryCache: new QueryCache(),
  });
}

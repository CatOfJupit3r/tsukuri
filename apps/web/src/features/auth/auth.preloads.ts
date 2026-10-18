import type { iRouterAppContext } from '#~/router-context';

import { meQueryOptions } from './hooks/use-me';

/** Loads the session before the first render, so server and client markup agree. */
export async function preloadMe({ queryClient }: iRouterAppContext) {
  return queryClient.ensureQueryData(meQueryOptions);
}

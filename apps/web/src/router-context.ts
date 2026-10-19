import type { QueryClient } from '@tanstack/react-query';

/** Context every route receives; the SSR and SPA roots share it. */
export interface iRouterAppContext {
  queryClient: QueryClient;
}

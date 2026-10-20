import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query';

import { ErrorBoundary } from '#~/components/error-boundary/error-boundary';

import { NotFound } from './components/not-found';
import { PseudoPage } from './components/pseudo-page';
import { createQueryClient } from './lib/query-client';
import { routeTree } from './routeTree.gen';

export const getRouter = () => {
  const queryClient = createQueryClient();

  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    context: { queryClient },
    defaultPendingComponent: PseudoPage,
    defaultNotFoundComponent: NotFound,
    defaultErrorComponent: ErrorBoundary,
  });

  setupRouterSsrQueryIntegration({ router, queryClient });

  return router;
};

declare module '@tanstack/react-router' {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}

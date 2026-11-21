import { createFileRoute } from '@tanstack/react-router';
import { getRequestIP } from '@tanstack/react-start/server';

import { forwardRequestToApi } from '#~/utils/forward-request-to-api';

/** Serves the shared API under `/api`, so this app is also the backend. */
export async function handleApiRequest({ request }: { request: Request }) {
  /** Without `xForwardedFor`, h3 reports the connection address, which a client cannot forge. */
  return forwardRequestToApi(request, { clientIp: getRequestIP() });
}

export const Route = createFileRoute('/api/$')({
  server: {
    handlers: {
      ANY: handleApiRequest,
    },
  },
});

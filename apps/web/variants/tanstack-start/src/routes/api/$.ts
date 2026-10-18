// sort-imports-ignore
import 'reflect-metadata';
import '../../load-env';
import { createFileRoute } from '@tanstack/react-router';

import { startApi } from '@startername/api/start-api';

const API_PREFIX = '/api';
const NOT_FOUND_STATUS = 404;

/** Serves the shared API under `/api`, so this app is also the backend. */
async function handleApiRequest({ request }: { request: Request }) {
  const url = new URL(request.url);
  url.pathname = url.pathname.slice(API_PREFIX.length) || '/';

  const response = await (await startApi()).handle(new Request(url, request));
  return response ?? new Response(null, { status: NOT_FOUND_STATUS });
}

export const Route = createFileRoute('/api/$')({
  server: {
    handlers: {
      ANY: handleApiRequest,
    },
  },
});

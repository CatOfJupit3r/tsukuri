import { INTERNAL_RENDER_SECRET_HEADER } from '@startername/common/constants/internal-render-secret';

import type { iServerRenderFetch } from '#~/utils/server-render-fetch.types';

const SESSION_LOOKUP_PATH = '/get-session';

/**
 * The fetch the server render uses against a backend in another process. It adds the shared secret to the render's
 * own session lookups and to nothing else, and removes any copy of the header a visitor's request carried.
 * Without a secret the render uses the network like a browser does.
 */
export function createServerRenderSecretFetch(secret: string | undefined): iServerRenderFetch | undefined {
  if (!secret) return undefined;

  return async (input, init) => {
    const request = new Request(input, init);
    request.headers.delete(INTERNAL_RENDER_SECRET_HEADER);
    const isSessionLookup = request.method === 'GET' && new URL(request.url).pathname.endsWith(SESSION_LOOKUP_PATH);
    if (isSessionLookup) request.headers.set(INTERNAL_RENDER_SECRET_HEADER, secret);
    return fetch(request);
  };
}

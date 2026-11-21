import { createIsomorphicFn } from '@tanstack/react-start';
import { getRequestHeaders } from '@tanstack/react-start/server';

import { clientAbsoluteLink } from '#~/utils/client-absolute-link';
import type { iServerRenderFetch } from '#~/utils/server-render-fetch.types';

/** Browsers reach the server through the `/api` proxy; the server render calls it directly. */
export const getBackendURL = createIsomorphicFn()
  .client((path: string) => clientAbsoluteLink(`/api${path}`))
  .server((path: string) => `${process.env.VITE_SERVER_URL}${path}`);

/** The visitor's cookies, forwarded when the server render calls the API on their behalf. */
export const getForwardedRequestHeaders = createIsomorphicFn()
  .client((): Record<string, string> => ({}))
  .server(() => Object.fromEntries(getRequestHeaders().entries()));

/** The backend runs in its own process, so the server render reaches it over the network like a browser does. */
export const getServerRenderFetch = createIsomorphicFn()
  .client((): iServerRenderFetch | undefined => undefined)
  .server((): iServerRenderFetch | undefined => undefined);

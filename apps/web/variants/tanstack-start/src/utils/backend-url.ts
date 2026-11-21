import { createIsomorphicFn } from '@tanstack/react-start';
import { getRequest, getRequestHeaders, getRequestIP } from '@tanstack/react-start/server';

import { clientAbsoluteLink } from '#~/utils/client-absolute-link';
import type { iServerRenderFetch } from '#~/utils/server-render-fetch.types';

const API_PREFIX = '/api';

/** The API is served by this app under `/api`, for the browser and the server render alike. */
export const getBackendURL = createIsomorphicFn()
  .client((path: string) => clientAbsoluteLink(`${API_PREFIX}${path}`))
  .server((path: string) => new URL(`${API_PREFIX}${path}`, getRequest().url).toString());

/** The visitor's cookies, forwarded when the server render calls the API on their behalf. */
export const getForwardedRequestHeaders = createIsomorphicFn()
  .client((): Record<string, string> => ({}))
  .server(() => Object.fromEntries(getRequestHeaders().entries()));

/**
 * The server render reaches the API inside this process, so its session lookups are not counted against one
 * shared per-address rate limit. Browsers use the network.
 */
export const getServerRenderFetch = createIsomorphicFn()
  .client((): iServerRenderFetch | undefined => undefined)
  .server((): iServerRenderFetch | undefined => async (input, init) => {
    const { forwardRequestToApi } = await import('#~/utils/forward-request-to-api');
    return forwardRequestToApi(new Request(input, init), { clientIp: getRequestIP(), isServerRender: true });
  });

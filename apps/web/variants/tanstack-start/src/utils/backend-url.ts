import { createIsomorphicFn } from '@tanstack/react-start';
import { getRequest, getRequestHeaders, getRequestIP } from '@tanstack/react-start/server';

import { API_PATH_PREFIX } from '#~/constants/api-path-prefix';
import { clientAbsoluteLink } from '#~/utils/client-absolute-link';
import type { iServerRenderFetch } from '#~/utils/server-render-fetch.types';

/** The API is served by this app under `/api`, for the browser and the server render alike. */
export const getBackendURL = createIsomorphicFn()
  .client((path: string) => clientAbsoluteLink(`${API_PATH_PREFIX}${path}`))
  .server((path: string) => new URL(`${API_PATH_PREFIX}${path}`, getRequest().url).toString());

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

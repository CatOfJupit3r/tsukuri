import { createIsomorphicFn } from '@tanstack/react-start';
import { getRequest, getRequestHeaders } from '@tanstack/react-start/server';

import { clientAbsoluteLink } from '#~/utils/client-absolute-link';

const API_PREFIX = '/api';

/** The API is served by this app under `/api`, for the browser and the server render alike. */
export const getBackendURL = createIsomorphicFn()
  .client((path: string) => clientAbsoluteLink(`${API_PREFIX}${path}`))
  .server((path: string) => new URL(`${API_PREFIX}${path}`, getRequest().url).toString());

/** The visitor's cookies, forwarded when the server render calls the API on their behalf. */
export const getForwardedRequestHeaders = createIsomorphicFn()
  .client((): Record<string, string> => ({}))
  .server(() => Object.fromEntries(getRequestHeaders().entries()));

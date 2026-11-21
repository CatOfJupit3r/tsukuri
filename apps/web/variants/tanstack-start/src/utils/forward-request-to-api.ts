// sort-imports-ignore
import 'reflect-metadata';
import '../load-env';

import type { iApiRequestOptions } from '@startername/api/features/http/api-request-handler';
import { startApi } from '@startername/api/start-api';

import { API_PATH_PREFIX } from '#~/constants/api-path-prefix';

const NOT_FOUND_STATUS = 404;

/** Hands a request addressed to `/api/...` to the shared API inside this process. */
export async function forwardRequestToApi(request: Request, options: iApiRequestOptions) {
  const url = new URL(request.url);
  url.pathname = url.pathname.slice(API_PATH_PREFIX.length) || '/';

  const response = await (await startApi()).handle(new Request(url, request), options);
  return response ?? new Response(null, { status: NOT_FOUND_STATUS });
}

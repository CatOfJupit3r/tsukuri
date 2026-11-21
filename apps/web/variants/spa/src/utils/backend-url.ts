import { API_PATH_PREFIX } from '#~/constants/api-path-prefix';
import { clientAbsoluteLink } from '#~/utils/client-absolute-link';
import type { iServerRenderFetch } from '#~/utils/server-render-fetch.types';

/** The dev server proxies `/api` to the backend; production serves both from one origin. */
export function getBackendURL(path: string) {
  return clientAbsoluteLink(`${API_PATH_PREFIX}${path}`);
}

/** The browser sends its own cookies. */
export function getForwardedRequestHeaders(): Record<string, string> {
  return {};
}

/** There is no server render: the browser reaches the API over the network. */
export function getServerRenderFetch(): iServerRenderFetch | undefined {
  return undefined;
}

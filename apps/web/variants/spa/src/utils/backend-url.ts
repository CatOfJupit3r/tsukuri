import { clientAbsoluteLink } from '#~/utils/client-absolute-link';

/** The dev server proxies `/api` to the backend; production serves both from one origin. */
export function getBackendURL(path: string) {
  return clientAbsoluteLink(`/api${path}`);
}

/** The browser sends its own cookies. */
export function getForwardedRequestHeaders(): Record<string, string> {
  return {};
}

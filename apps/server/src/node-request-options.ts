import { getConnInfo } from '@hono/node-server/conninfo';

import type { iCreateAppOptions } from '#~/app';

/** Behind no proxy the socket address is the only client address a request cannot forge. */
export function nodeRequestOptions(...[context]: Parameters<NonNullable<iCreateAppOptions['requestOptions']>>) {
  return { clientIp: getConnInfo(context).remote.address };
}

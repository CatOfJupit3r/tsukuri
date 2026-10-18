import type { KVNamespace } from '@cloudflare/workers-types';
import type { InjectionToken } from 'tsyringe';

/** The Worker registers its `KV` binding under this token. */
export const KV_NAMESPACE_TOKEN: InjectionToken<KVNamespace> = Symbol.for('CloudflareKvNamespace');

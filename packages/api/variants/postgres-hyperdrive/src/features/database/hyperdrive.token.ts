import type { Hyperdrive } from '@cloudflare/workers-types';
import type { InjectionToken } from 'tsyringe';

/** The Worker registers its `HYPERDRIVE` binding under this token. */
export const HYPERDRIVE_TOKEN: InjectionToken<Hyperdrive> = Symbol.for('CloudflareHyperdrive');

import type { D1Database } from '@cloudflare/workers-types';
import type { InjectionToken } from 'tsyringe';

/** The Worker registers its `DB` binding under this token. */
export const D1_DATABASE_TOKEN: InjectionToken<D1Database> = Symbol.for('CloudflareD1Database');

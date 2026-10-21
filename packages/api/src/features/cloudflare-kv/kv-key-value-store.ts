import type { KVNamespace } from '@cloudflare/workers-types';
import { inject, singleton } from 'tsyringe';

import type { iKeyValueStore } from '#~/features/cache/key-value-store';
import { UnexpectedServerError } from '#~/lib/orpc-error-wrapper';

import { KV_NAMESPACE_TOKEN } from './kv-namespace.token';

/** KV refuses shorter expirations. */
const MINIMUM_TTL_SECONDS = 60;
const GLOB_WILDCARD = '*';

/** Bound to `KEY_VALUE_STORE_TOKEN`, so caching and auth sessions use Cloudflare KV on the Worker. */
@singleton()
export class KvKeyValueStore implements iKeyValueStore {
  public readonly isConnected = true;

  public constructor(@inject(KV_NAMESPACE_TOKEN) private readonly kvNamespace: KVNamespace) {}

  public async get(key: string) {
    return this.kvNamespace.get(key);
  }

  public async set(key: string, value: string, ttlSeconds?: number) {
    const options = ttlSeconds ? { expirationTtl: Math.max(ttlSeconds, MINIMUM_TTL_SECONDS) } : undefined;
    await this.kvNamespace.put(key, value, options);
  }

  public async delete(key: string) {
    await this.kvNamespace.delete(key);
  }

  /** KV lists keys by prefix, so a pattern is either an exact key or ends in its only `*` (such as `user:*`). */
  public async deleteMatching(pattern: string) {
    if (!pattern.includes(GLOB_WILDCARD)) return this.deleteExisting(pattern);

    const prefix = this.toPrefix(pattern);
    let deletedCount = 0;
    let cursor: string | undefined;

    do {
      const page = await this.kvNamespace.list({ prefix, cursor });
      await Promise.all(page.keys.map(async (key) => this.kvNamespace.delete(key.name)));
      deletedCount += page.keys.length;
      cursor = page.list_complete ? undefined : page.cursor;
    } while (cursor);

    return deletedCount;
  }

  private async deleteExisting(key: string) {
    if ((await this.kvNamespace.get(key)) === null) return 0;
    await this.kvNamespace.delete(key);
    return 1;
  }

  private toPrefix(pattern: string) {
    const prefix = pattern.slice(0, -GLOB_WILDCARD.length);
    if (!pattern.endsWith(GLOB_WILDCARD) || prefix.includes(GLOB_WILDCARD)) {
      throw new UnexpectedServerError(`KV can only delete keys by prefix, not by the pattern "${pattern}"`);
    }
    return prefix;
  }
}

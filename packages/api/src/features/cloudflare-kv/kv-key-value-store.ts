import type { KVNamespace } from '@cloudflare/workers-types';
import { inject, singleton } from 'tsyringe';

import type { iKeyValueStore } from '#~/features/cache/key-value-store';
import { assertExpiryAllowed } from '#~/features/cache/key-value-store';
import { UnexpectedServerError } from '#~/lib/orpc-error-wrapper';

import {
  DELETE_BATCH_SIZE,
  GLOB_SPECIAL_CHARACTERS,
  GLOB_WILDCARD,
  MAX_KEYS_PER_PATTERN_DELETE,
  MINIMUM_TTL_SECONDS,
} from './cloudflare-kv.constants';
import { KV_NAMESPACE_TOKEN } from './kv-namespace.token';

/** Bound to `KEY_VALUE_STORE_TOKEN`, so caching and auth sessions use Cloudflare KV on the Worker. */
@singleton()
export class KvKeyValueStore implements iKeyValueStore {
  public readonly isConnected = true;

  /** Writes take up to a minute to reach other locations, and one key accepts about one write a second. */
  public readonly isStronglyConsistent = false;

  public readonly minimumTtlSeconds = MINIMUM_TTL_SECONDS;

  constructor(@inject(KV_NAMESPACE_TOKEN) private readonly kvNamespace: KVNamespace) {}

  public async get(key: string) {
    return this.kvNamespace.get(key);
  }

  public async set(key: string, value: string, ttlSeconds?: number) {
    if (ttlSeconds === undefined) {
      await this.kvNamespace.put(key, value);
      return;
    }
    assertExpiryAllowed(this, 'KV', key, ttlSeconds);
    await this.kvNamespace.put(key, value, { expirationTtl: ttlSeconds });
  }

  public async delete(key: string) {
    await this.kvNamespace.delete(key);
  }

  /**
   * Matches like Valkey for the patterns KV can serve: an exact key, or a prefix followed by its only `*`
   * (such as `user:*`). Any other glob is refused rather than taken as a key.
   */
  public async deleteMatching(pattern: string) {
    const prefix = this.toPrefix(pattern);
    if (prefix === null) {
      await this.kvNamespace.delete(pattern);
      return;
    }

    const keys = await this.listKeys(prefix, pattern);
    for (let start = 0; start < keys.length; start += DELETE_BATCH_SIZE) {
      await Promise.all(keys.slice(start, start + DELETE_BATCH_SIZE).map(async (key) => this.kvNamespace.delete(key)));
    }
  }

  /** The prefix a pattern lists, or null for an exact key. */
  private toPrefix(pattern: string) {
    if (!GLOB_SPECIAL_CHARACTERS.test(pattern)) return null;

    const prefix = pattern.slice(0, -GLOB_WILDCARD.length);
    if (!pattern.endsWith(GLOB_WILDCARD) || GLOB_SPECIAL_CHARACTERS.test(prefix)) {
      throw new UnexpectedServerError(
        `KV can only match an exact key or a prefix ending in "${GLOB_WILDCARD}", not the pattern "${pattern}"`,
      );
    }
    return prefix;
  }

  /** Every key under `prefix`, refusing before any delete when there are more than one call may remove. */
  private async listKeys(prefix: string, pattern: string) {
    const keys: string[] = [];
    let cursor: string | undefined;

    do {
      const page = await this.kvNamespace.list({ prefix, cursor });
      keys.push(...page.keys.map((key) => key.name));
      if (keys.length > MAX_KEYS_PER_PATTERN_DELETE) {
        throw new UnexpectedServerError(
          `"${pattern}" matches more than ${MAX_KEYS_PER_PATTERN_DELETE} KV keys, more than one request may delete`,
        );
      }
      cursor = page.list_complete ? undefined : page.cursor;
    } while (cursor);

    return keys;
  }
}

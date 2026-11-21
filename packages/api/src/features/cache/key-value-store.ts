import { singleton } from 'tsyringe';

/** A string key-value store with expiry; a module such as valkey binds one to `KEY_VALUE_STORE_TOKEN`. */
export interface iKeyValueStore {
  /** False while no backing store is reachable; callers then skip caching instead of failing. */
  readonly isConnected: boolean;
  /**
   * True when a write is visible to the next read everywhere and a key may be written many times a second.
   * Eventually consistent stores (Cloudflare KV) are false, so frequently written state stays elsewhere.
   */
  readonly isStronglyConsistent: boolean;
  /** The shortest `ttlSeconds` `set` accepts; shorter ones are refused, so callers raise them knowingly. */
  readonly minimumTtlSeconds: number;
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, ttlSeconds?: number) => Promise<void>;
  delete: (key: string) => Promise<void>;
  /** Deletes every key matching a glob pattern such as `user:*`. */
  deleteMatching: (pattern: string) => Promise<void>;
}

/** Whole seconds, the smallest expiry Valkey (`SET ... EX`) and most stores take. */
export const SMALLEST_EXPIRY_SECONDS = 1;

export const KEY_VALUE_STORE_TOKEN = Symbol.for('KeyValueStore');

/** Bound until a module provides a real store: nothing is cached. */
@singleton()
export class NoopKeyValueStore implements iKeyValueStore {
  public readonly isConnected = false;

  public readonly isStronglyConsistent = true;

  public readonly minimumTtlSeconds = SMALLEST_EXPIRY_SECONDS;

  public async get() {
    return null;
  }

  public async set() {}

  public async delete() {}

  public async deleteMatching() {}
}

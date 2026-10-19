import { singleton } from 'tsyringe';

/** A string key-value store with expiry; a module such as valkey binds one to `KEY_VALUE_STORE_TOKEN`. */
export interface iKeyValueStore {
  /** False while no backing store is reachable; callers then skip caching instead of failing. */
  readonly isConnected: boolean;
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, ttlSeconds?: number) => Promise<void>;
  delete: (key: string) => Promise<void>;
  /** Deletes every key matching a glob pattern such as `user:*` and returns how many were removed. */
  deleteMatching: (pattern: string) => Promise<number>;
}

export const KEY_VALUE_STORE_TOKEN = Symbol.for('KeyValueStore');

/** Bound until a module provides a real store: nothing is cached. */
@singleton()
export class NoopKeyValueStore implements iKeyValueStore {
  public readonly isConnected = false;

  public async get() {
    return null;
  }

  public async set() {}

  public async delete() {}

  public async deleteMatching() {
    return 0;
  }
}

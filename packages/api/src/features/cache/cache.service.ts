import { inject, singleton } from 'tsyringe';

import { tryCatch } from '@startername/common/helpers/error-handling.helper';

import { LoggerFactory } from '#~/features/logger/logger.factory';
import type { iWithLogger, LoggerType } from '#~/features/logger/logger.types';

import type { iKeyValueStore } from './key-value-store';
import { KEY_VALUE_STORE_TOKEN } from './key-value-store';

/** JSON cache over the bound key-value store. Failures and a missing store only skip the cache. */
@singleton()
export class CacheService implements iWithLogger {
  public readonly logger: LoggerType;

  public constructor(
    @inject(KEY_VALUE_STORE_TOKEN) private readonly store: iKeyValueStore,
    loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.create('cache');
  }

  public async get<T>(key: string): Promise<T | Nil> {
    if (!this.store.isConnected) return null;

    const { data, error } = await tryCatch(async () => {
      const cached = await this.store.get(key);
      return cached === null ? null : (JSON.parse(cached) as T);
    });

    if (error) {
      this.logger.warn('Cache get failed', { key, error });
      return null;
    }
    return data;
  }

  public async set<T>(key: string, value: T, ttlSeconds: number) {
    if (!this.store.isConnected) return;

    const { error } = await tryCatch(async () => this.store.set(key, JSON.stringify(value), ttlSeconds));
    if (error) this.logger.warn('Cache set failed', { key, error });
  }

  public async delete(key: string) {
    if (!this.store.isConnected) return;

    const { error } = await tryCatch(async () => this.store.delete(key));
    if (error) this.logger.warn('Cache delete failed', { key, error });
  }

  /**
   * Invalidate all keys matching a pattern
   *
   * @example Invalidate all user caches:
   * ```typescript
   * await cacheService.invalidatePattern('user:*');
   * ```
   */
  public async invalidatePattern(pattern: string) {
    if (!this.store.isConnected) return;

    const { data: deletedCount, error } = await tryCatch(async () => this.store.deleteMatching(pattern));
    if (error) {
      this.logger.warn('Cache pattern invalidation failed', { pattern, error });
      return;
    }
    if (deletedCount && deletedCount > 0) this.logger.debug('Invalidated cache keys', { pattern, count: deletedCount });
  }

  /**
   * Cache-aside: returns the cached value, or fetches, caches and returns it on a miss.
   *
   * @example
   * ```typescript
   * const stats = await cacheService.cached(
   *   buildCacheKey.stats('dashboard', organizationId),
   *   CACHE_TTL.AGGREGATION_MEDIUM,
   *   () => computeExpensiveStats(organizationId),
   * );
   * ```
   */
  public async cached<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null && cached !== undefined) return cached;

    const data = await fetcher();
    await this.set(key, data, ttlSeconds);
    return data;
  }
}

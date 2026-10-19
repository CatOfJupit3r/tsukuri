import { singleton } from 'tsyringe';

import { CACHE_TTL } from '#~/features/cache/cache.constants';
import { CacheService } from '#~/features/cache/cache.service';
import { LoggerFactory } from '#~/features/logger/logger.factory';
import type { iWithLogger } from '#~/features/logger/logger.types';

import { buildBadgesCacheKey } from './badges.cache-keys';
import { BADGES_META } from './badges.constants';

@singleton()
export class BadgesService implements iWithLogger {
  public readonly logger: iWithLogger['logger'];

  constructor(
    private readonly cacheService: CacheService,
    loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.create('badges');
  }

  public async listAllBadges() {
    return this.cacheService.cached(buildBadgesCacheKey.all(), CACHE_TTL.STATIC, async () => {
      this.logger.debug('Cache miss for badges list, returning static data');
      return BADGES_META;
    });
  }
}

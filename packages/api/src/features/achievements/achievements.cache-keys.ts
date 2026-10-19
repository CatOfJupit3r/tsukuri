import { CACHE_PREFIX } from '#~/features/cache/cache.constants';

const ACHIEVEMENTS_CACHE_PREFIX = 'achievements';

export const buildAchievementsCacheKey = {
  /** All achievements (static) */
  all: () => `${ACHIEVEMENTS_CACHE_PREFIX}:all`,

  /** A user's unlocked achievements */
  ofUser: (userId: string) => `${CACHE_PREFIX.USER}:${userId}:achievements`,
} as const;

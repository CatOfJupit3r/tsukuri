const BADGES_CACHE_PREFIX = 'badges';

export const buildBadgesCacheKey = {
  /** All badges (static) */
  all: () => `${BADGES_CACHE_PREFIX}:all`,
} as const;

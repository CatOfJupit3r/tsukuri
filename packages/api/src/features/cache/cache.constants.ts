/**
 * Cache TTL (Time To Live) constants in seconds
 *
 * Use these constants to ensure consistent cache expiration across the application.
 * Adjust values based on your data freshness requirements.
 */
export const CACHE_TTL = {
  /** Static data that rarely changes during runtime (1 hour) */
  STATIC: 3600,

  /** Lists with pagination - short duration (30 seconds) */
  LIST_SHORT: 30,

  /** Lists with pagination - medium duration (1 minute) */
  LIST_MEDIUM: 60,

  /** Single entity by ID - short duration (2 minutes) */
  ENTITY_SHORT: 120,

  /** Single entity by ID - medium duration (5 minutes) */
  ENTITY_MEDIUM: 300,

  /** Expensive aggregations - medium duration (5 minutes) */
  AGGREGATION_MEDIUM: 300,

  /** Expensive aggregations - long duration (10 minutes) */
  AGGREGATION_LONG: 600,

  /** User-specific data (1 minute) */
  USER_DATA: 60,
} as const;

/**
 * Cache key prefixes for consistent naming. Features add their own prefixes and key builders next
 * to their code, e.g. `achievements.cache-keys.ts`.
 */
export const CACHE_PREFIX = {
  /** User-related cache */
  USER: 'user',
  /** Generic entity cache */
  ENTITY: 'entity',
  /** Generic list cache */
  LIST: 'list',
  /** Aggregation/stats cache */
  STATS: 'stats',
} as const;

/** Builders for the generic cache keys. */
export const buildCacheKey = {
  /** Build cache key for user-specific data */
  userData: (userId: string, dataType: string) => `${CACHE_PREFIX.USER}:${userId}:${dataType}`,

  /** Build cache key for a generic entity */
  entity: (entityType: string, entityId: string) => `${CACHE_PREFIX.ENTITY}:${entityType}:${entityId}`,

  /** Build cache key for a paginated list */
  list: (entityType: string, limit: number, offset: number) => `${CACHE_PREFIX.LIST}:${entityType}:${limit}:${offset}`,

  /** Build cache key for stats/aggregations */
  stats: (statType: string, ...params: string[]) =>
    `${CACHE_PREFIX.STATS}:${statType}${params.length > 0 ? `:${params.join(':')}` : ''}`,
} as const;

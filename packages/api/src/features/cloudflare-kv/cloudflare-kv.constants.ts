/** KV refuses expirations shorter than this. */
export const MINIMUM_TTL_SECONDS = 60;

/** The one glob wildcard KV can serve: listing keys by prefix stands in for a trailing `*`. */
export const GLOB_WILDCARD = '*';

/** Characters that make a Valkey `MATCH` pattern a glob rather than an exact key. */
export const GLOB_SPECIAL_CHARACTERS = /[*?[\]\\]/;

/**
 * Most keys one pattern may delete. A Worker invocation may make 1,000 KV operations, and every key costs
 * one delete; the rest is left for listing and for the work of the request itself.
 */
export const MAX_KEYS_PER_PATTERN_DELETE = 500;

/** Deletes sent at once, so a large pattern does not open hundreds of requests together. */
export const DELETE_BATCH_SIZE = 50;

import { CACHE_TTL } from '#~/features/cache/cache.constants';
import { MINIMUM_TTL_SECONDS } from '#~/features/cloudflare-kv/cloudflare-kv.constants';

describe('CACHE_TTL', () => {
  it.each(Object.entries(CACHE_TTL))('%s can be cached on Cloudflare KV', (_name, ttlSeconds) => {
    expect(ttlSeconds).toBeGreaterThanOrEqual(MINIMUM_TTL_SECONDS);
  });
});

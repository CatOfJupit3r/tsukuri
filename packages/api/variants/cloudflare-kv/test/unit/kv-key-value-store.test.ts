import { startLocalKvNamespace } from '#test/helpers/cloudflare-platform';

import {
  DELETE_BATCH_SIZE,
  MAX_KEYS_PER_PATTERN_DELETE,
  MINIMUM_TTL_SECONDS,
} from '#~/features/cloudflare-kv/cloudflare-kv.constants';
import { KvKeyValueStore } from '#~/features/cloudflare-kv/kv-key-value-store';

const local = await startLocalKvNamespace();
const store = new KvKeyValueStore(local.binding);

afterAll(async () => {
  await local.dispose();
});

async function storedKeys() {
  return (await local.binding.list()).keys;
}

describe('KvKeyValueStore', () => {
  afterEach(async () => {
    await Promise.all((await storedKeys()).map(async (key) => local.binding.delete(key.name)));
  });

  it('stores values with the expiry it was given and deletes them by key', async () => {
    await store.set('session:one', 'value', MINIMUM_TTL_SECONDS * 2);

    expect(await store.get('session:one')).toBe('value');
    const [stored] = await storedKeys();
    expect(stored?.expiration).toBeGreaterThanOrEqual(Math.floor(Date.now() / 1000) + MINIMUM_TTL_SECONDS);

    await store.delete('session:one');
    expect(await store.get('session:one')).toBeNull();
  });

  it('refuses an expiry shorter than KV keeps keys instead of keeping the key longer', async () => {
    await expect(store.set('short', 'value', MINIMUM_TTL_SECONDS - 1)).rejects.toThrow(
      `at least ${MINIMUM_TTL_SECONDS} seconds`,
    );
    expect(await store.get('short')).toBeNull();
  });

  it('deletes every key under a prefix pattern and only those', async () => {
    await Promise.all(['user:1', 'user:2', 'team:1'].map(async (key) => store.set(key, key)));

    await store.deleteMatching('user:*');

    expect((await storedKeys()).map((key) => key.name)).toEqual(['team:1']);
  });

  it('deletes more keys than one batch holds, one delete per key', async () => {
    const keyCount = DELETE_BATCH_SIZE * 2 + 1;
    const keys = Array.from({ length: keyCount }, (_unused, index) => `bulk:${index}`);
    await Promise.all(keys.map(async (key) => store.set(key, key)));
    // The local binding is a proxy that hands out a fresh method on every access, so a spy would never see the calls.
    const deletedKeys: string[] = [];
    const countingBinding = new Proxy(local.binding, {
      get(target, property) {
        const value: unknown = Reflect.get(target, property);
        if (property !== 'delete') return value;
        return async (key: string) => {
          deletedKeys.push(key);
          await target.delete(key);
        };
      },
    });

    await new KvKeyValueStore(countingBinding).deleteMatching('bulk:*');

    expect(deletedKeys).toHaveLength(keyCount);
    expect(await storedKeys()).toEqual([]);
  });

  it('treats a pattern without glob characters as one exact key, as Valkey does', async () => {
    await Promise.all(['exact', 'exact:child'].map(async (key) => store.set(key, key)));

    await store.deleteMatching('exact');

    expect((await storedKeys()).map((key) => key.name)).toEqual(['exact:child']);
  });

  it.each(['user:*:sessions', 'user:?', 'user:[ab]', 'user\\*'])(
    'refuses the glob %s instead of deleting a key of that name',
    async (pattern) => {
      await store.set(pattern, 'value');

      await expect(store.deleteMatching(pattern)).rejects.toThrow('KV can only match');
      expect(await store.get(pattern)).toBe('value');
    },
  );

  it('deletes nothing when a pattern matches more keys than one request may delete', async () => {
    const keys = Array.from({ length: MAX_KEYS_PER_PATTERN_DELETE + 1 }, (_, index) => `bulk:${index}`);
    await Promise.all(keys.map(async (key) => store.set(key, key)));

    await expect(store.deleteMatching('bulk:*')).rejects.toThrow(`more than ${MAX_KEYS_PER_PATTERN_DELETE}`);
    expect(await storedKeys()).toHaveLength(keys.length);
  });
});

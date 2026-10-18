import type { KVNamespace } from '@cloudflare/workers-types';

import { KvKeyValueStore } from '#~/features/cloudflare-kv/kv-key-value-store';

import { startLocalCloudflarePlatform } from '../helpers/cloudflare-platform';

interface iKvBindings extends Record<string, unknown> {
  KV: KVNamespace;
}

const platform = await startLocalCloudflarePlatform<iKvBindings>({ kv_namespaces: [{ binding: 'KV', id: 'local' }] });
const store = new KvKeyValueStore(platform.env.KV);

afterAll(async () => {
  await platform.dispose();
});

describe('KvKeyValueStore', () => {
  it('stores values and deletes them by key', async () => {
    await store.set('session:one', 'value', 5);

    expect(await store.get('session:one')).toBe('value');
    await store.delete('session:one');
    expect(await store.get('session:one')).toBeNull();
  });

  it('deletes every key under a prefix pattern and only those', async () => {
    await Promise.all(['user:1', 'user:2', 'team:1'].map(async (key) => store.set(key, key)));

    expect(await store.deleteMatching('user:*')).toBe(2);
    expect(await store.get('user:1')).toBeNull();
    expect(await store.get('team:1')).toBe('team:1');
  });

  it('treats a pattern without a wildcard as one exact key', async () => {
    await Promise.all(['exact', 'exact:child'].map(async (key) => store.set(key, key)));

    expect(await store.deleteMatching('exact')).toBe(1);
    expect(await store.get('exact:child')).toBe('exact:child');
  });

  it('refuses patterns KV cannot list by prefix', async () => {
    await expect(store.deleteMatching('user:*:sessions')).rejects.toThrow('KV can only delete keys by prefix');
  });
});

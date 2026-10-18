import type { KVNamespace } from '@cloudflare/workers-types';
import { container } from 'tsyringe';

import { KV_NAMESPACE_TOKEN } from '#~/features/cloudflare-kv/kv-namespace.token';

import { startLocalCloudflarePlatform } from '../cloudflare-platform';

interface iKvBindings extends Record<string, unknown> {
  KV: KVNamespace;
}

const testKvKey = Symbol.for('startername.test.kv');
const testGlobals = globalThis as typeof globalThis & { [testKvKey]?: Promise<KVNamespace> };

/** A local KV namespace, shared by every integration test file, behind the KV key-value store. */
async function createTestKv() {
  const platform = await startLocalCloudflarePlatform<iKvBindings>({ kv_namespaces: [{ binding: 'KV', id: 'local' }] });
  return platform.env.KV;
}

testGlobals[testKvKey] ??= createTestKv();
container.registerInstance(KV_NAMESPACE_TOKEN, await testGlobals[testKvKey]);

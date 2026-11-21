import { startLocalKvNamespace } from '#test/helpers/cloudflare-platform';
import type { KVNamespace } from '@cloudflare/workers-types';
import { container } from 'tsyringe';

import { KV_NAMESPACE_TOKEN } from '#~/features/cloudflare-kv/kv-namespace.token';

const testKvKey = Symbol.for('startername.test.kv');
const testGlobals = globalThis as typeof globalThis & { [testKvKey]?: Promise<KVNamespace> };

/** A local KV namespace behind the KV key-value store, shared by every integration test file of the run. */
async function createTestKv() {
  const { binding } = await startLocalKvNamespace();
  return binding;
}

testGlobals[testKvKey] ??= createTestKv();
container.registerInstance(KV_NAMESPACE_TOKEN, await testGlobals[testKvKey]);

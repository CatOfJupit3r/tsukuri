import { startLocalKvNamespace } from '#test/helpers/cloudflare-platform';
import type { KVNamespace } from '@cloudflare/workers-types';
import { container } from 'tsyringe';

import { KV_NAMESPACE_TOKEN } from '#~/features/cloudflare-kv/kv-namespace.token';

declare global {
  /** The local namespace the first test file of the run starts, shared by the rest. */
  var starternameTestKv: Promise<KVNamespace> | undefined;
}

/** A local KV namespace behind the KV key-value store, shared by every integration test file of the run. */
async function createTestKv() {
  const { binding } = await startLocalKvNamespace();
  return binding;
}

globalThis.starternameTestKv ??= createTestKv();
container.registerInstance(KV_NAMESPACE_TOKEN, await globalThis.starternameTestKv);

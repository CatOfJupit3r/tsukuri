import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { getPlatformProxy } from 'wrangler';

const COMPATIBILITY_DATE = '2026-10-01';

/**
 * Local Cloudflare bindings (D1, KV, ...) in Node, simulated by wrangler the way `wrangler dev` provides
 * them. `bindings` are wrangler config sections such as `{ kv_namespaces: [{ binding: 'KV', id: 'local' }] }`.
 */
export async function startLocalCloudflarePlatform<TBindings extends Record<string, unknown>>(
  bindings: Record<string, unknown>,
) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'startername-bindings-'));
  const configPath = path.join(directory, 'wrangler.json');
  await writeFile(
    configPath,
    JSON.stringify({ name: 'startername-test', compatibility_date: COMPATIBILITY_DATE, ...bindings }),
  );
  return getPlatformProxy<TBindings>({ configPath, persist: false, envFiles: [] });
}

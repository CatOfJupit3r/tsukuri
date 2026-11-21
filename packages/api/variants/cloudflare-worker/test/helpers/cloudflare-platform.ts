import type { D1Database, Hyperdrive, KVNamespace } from '@cloudflare/workers-types';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { getPlatformProxy, unstable_readConfig } from 'wrangler';

/** The Worker's wrangler config, whose compatibility date local bindings run on. */
const WORKER_CONFIG_PATH = path.resolve(import.meta.dirname, '../../../../apps/worker/wrangler.jsonc');
/** Each local platform holds one binding, so its name only has to be unique inside that config. */
const LOCAL_BINDING = 'BINDING';
const LOCAL_RESOURCE_ID = 'local';

interface iLocalBinding<TBinding> {
  binding: TBinding;
  dispose: () => Promise<void>;
}

/**
 * One local Cloudflare binding in Node, simulated by wrangler the way `wrangler dev` provides it.
 * `section` is the wrangler config section that declares it.
 */
async function startLocalBinding<TBinding>(section: string, entry: Record<string, unknown>) {
  const { compatibility_date: compatibilityDate } = unstable_readConfig({ config: WORKER_CONFIG_PATH });
  const directory = await mkdtemp(path.join(os.tmpdir(), 'cloudflare-binding-'));
  try {
    const configPath = path.join(directory, 'wrangler.json');
    await writeFile(
      configPath,
      JSON.stringify({
        name: 'local-binding',
        compatibility_date: compatibilityDate,
        [section]: [{ binding: LOCAL_BINDING, ...entry }],
      }),
    );
    const platform = await getPlatformProxy<Record<typeof LOCAL_BINDING, TBinding>>({
      configPath,
      persist: false,
      envFiles: [],
    });
    return {
      binding: platform.env[LOCAL_BINDING],
      dispose: async () => platform.dispose(),
    } satisfies iLocalBinding<TBinding>;
  } finally {
    // The running platform no longer reads its config.
    await rm(directory, { recursive: true, force: true });
  }
}

export async function startLocalKvNamespace() {
  return startLocalBinding<KVNamespace>('kv_namespaces', { id: LOCAL_RESOURCE_ID });
}

export async function startLocalD1Database() {
  return startLocalBinding<D1Database>('d1_databases', {
    database_name: LOCAL_BINDING.toLowerCase(),
    database_id: LOCAL_RESOURCE_ID,
  });
}

export async function startLocalHyperdrive(localConnectionString: string) {
  return startLocalBinding<Hyperdrive>('hyperdrive', { id: LOCAL_RESOURCE_ID, localConnectionString });
}

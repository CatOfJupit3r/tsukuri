import type { Hyperdrive } from '@cloudflare/workers-types';
import { container } from 'tsyringe';

import { env } from '#~/constants/env';
import { HYPERDRIVE_TOKEN } from '#~/features/database/hyperdrive.token';

import { startLocalCloudflarePlatform } from '../cloudflare-platform';

interface iHyperdriveBindings extends Record<string, unknown> {
  HYPERDRIVE: Hyperdrive;
}

const testHyperdriveKey = Symbol.for('startername.test.hyperdrive');
const testGlobals = globalThis as typeof globalThis & { [testHyperdriveKey]?: Promise<Hyperdrive> };

/** A local Hyperdrive binding to `POSTGRES_URL`; tests still query the in-memory database. */
async function createTestHyperdrive() {
  const platform = await startLocalCloudflarePlatform<iHyperdriveBindings>({
    hyperdrive: [{ binding: 'HYPERDRIVE', id: 'local', localConnectionString: env.POSTGRES_URL }],
  });
  return platform.env.HYPERDRIVE;
}

testGlobals[testHyperdriveKey] ??= createTestHyperdrive();
container.registerInstance(HYPERDRIVE_TOKEN, await testGlobals[testHyperdriveKey]);

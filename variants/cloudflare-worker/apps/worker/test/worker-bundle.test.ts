import path from 'node:path';
import { unstable_startWorker } from 'wrangler';

import { loadExampleEnv } from '@startername/vitest-config/example-env';

const BUNDLE_TIMEOUT_MS = 120_000;

/** The example env as plain-text vars, which the Worker runtime exposes on `process.env`. */
function exampleVars(overrides: Record<string, string> = {}) {
  const variables = loadExampleEnv(path.resolve(import.meta.dirname, '../../..'), {
    NODE_ENV: 'test',
    LOG_LEVEL: 'error',
    ...overrides,
  });
  return Object.fromEntries(
    Object.entries(variables).map(([name, value]) => [name, { type: 'plain_text' as const, value }]),
  );
}

/** Builds the tsdown bundle and runs it in workerd, the way `wrangler dev` and a deployment do. Hands the running Worker to `check` and always disposes it. */
async function withRunningWorker(
  overrides: Record<string, string>,
  check: (worker: Awaited<ReturnType<typeof unstable_startWorker>>) => Promise<void>,
) {
  const worker = await unstable_startWorker({
    config: path.resolve(import.meta.dirname, '../wrangler.jsonc'),
    bindings: exampleVars(overrides),
    dev: { persist: false, server: { port: 0 }, inspector: false },
  });
  try {
    await worker.ready;
    await check(worker);
  } finally {
    await worker.dispose();
  }
}

describe('Worker bundle', () => {
  it(
    'starts the API in the Worker runtime and serves it',
    async () => {
      await withRunningWorker({}, async (worker) => {
        const response = await worker.fetch('http://localhost/health');

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ status: 'OK' });
      });
    },
    BUNDLE_TIMEOUT_MS,
  );

  it(
    'starts with production vars and a real secret, and keeps dev impersonation off',
    async () => {
      await withRunningWorker({ NODE_ENV: 'production', BETTER_AUTH_SECRET: 'x'.repeat(48) }, async (worker) => {
        const health = await worker.fetch('http://localhost/health');
        const impersonation = await worker.fetch('http://localhost/dev-tools/impersonate/any-user-id', {
          method: 'POST',
        });

        expect(health.status).toBe(200);
        expect(impersonation.status).toBe(404);
      });
    },
    BUNDLE_TIMEOUT_MS,
  );
});


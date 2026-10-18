import path from 'node:path';
import { unstable_startWorker } from 'wrangler';

import { loadExampleEnv } from '@startername/vitest-config/example-env';

const BUNDLE_TIMEOUT_MS = 120_000;

/** The example env as plain-text vars, which the Worker runtime exposes on `process.env`. */
function exampleVars() {
  const variables = loadExampleEnv(path.resolve(import.meta.dirname, '../../..'), { NODE_ENV: 'test', LOG_LEVEL: 'error' });
  return Object.fromEntries(
    Object.entries(variables).map(([name, value]) => [name, { type: 'plain_text' as const, value }]),
  );
}

/** Builds the tsdown bundle and runs it in workerd, the way `wrangler dev` and a deployment do. */
describe('Worker bundle', () => {
  it(
    'starts the API in the Worker runtime and serves it',
    async () => {
      const worker = await unstable_startWorker({
        config: path.resolve(import.meta.dirname, '../wrangler.jsonc'),
        bindings: exampleVars(),
        dev: { persist: false, server: { port: 0 }, inspector: false },
      });

      try {
        await worker.ready;
        const response = await worker.fetch('http://localhost/health');

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ status: 'OK' });
      } finally {
        await worker.dispose();
      }
    },
    BUNDLE_TIMEOUT_MS,
  );
});

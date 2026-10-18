import { container } from 'tsyringe';
import { getPlatformProxy } from 'wrangler';

import { startApi } from '@startername/api/start-api';

import { createApp } from '#~/app';
import type { iWorkerBindings } from '#~/generated/worker-bindings';
import { registerWorkerBindings } from '#~/generated/worker-bindings';

// Local stand-ins for the bindings in wrangler.jsonc, as `wrangler dev` provides them.
const platform = await getPlatformProxy<iWorkerBindings>({ configPath: 'wrangler.jsonc', persist: false });
registerWorkerBindings(container, platform.env);

afterAll(async () => {
  await platform.dispose();
});

describe('Worker adapter', () => {
  it('serves the API router as REST', async () => {
    const app = createApp(await startApi());

    const response = await app.request('/health');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'OK' });
  });

  it('lets requests no API route serves fall through to a 404', async () => {
    const app = createApp(await startApi());

    expect((await app.request('/no-such-route')).status).toBe(404);
  });
});

import { startApi } from '@startername/api/start-api';

import { createApp } from '#~/app';

describe('Hono adapter', () => {
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

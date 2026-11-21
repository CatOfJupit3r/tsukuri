import { getPlatformProxy } from 'wrangler';

import { startApi } from '@startername/api/start-api';

import type { iWorkerBindings } from '#~/generated/worker-bindings';
import worker from '#~/worker';

vi.mock('@startername/api/start-api', { spy: true });

// Local stand-ins for the bindings and execution context in wrangler.jsonc, as `wrangler dev` provides them.
const platform = await getPlatformProxy<iWorkerBindings>({ configPath: 'wrangler.jsonc', persist: false });

afterAll(async () => {
  await platform.dispose();
});

describe('Worker entry', () => {
  it('starts the API again on the next request after a start failed', async () => {
    vi.mocked(startApi).mockRejectedValueOnce(new Error('binding not ready'));

    await expect(worker.fetch(new Request('http://localhost/health'), platform.env, platform.ctx)).rejects.toThrow(
      'binding not ready',
    );
    const response = await worker.fetch(new Request('http://localhost/health'), platform.env, platform.ctx);

    expect(response.status).toBe(200);
    expect(startApi).toHaveBeenCalledTimes(2);
  });
});

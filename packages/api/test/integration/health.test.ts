import { container } from 'tsyringe';

import { ApiRequestHandler } from '#~/features/http/api-request-handler';

const BASE_URL = 'http://localhost';

describe('API request handler', () => {
  const handler = () => container.resolve(ApiRequestHandler);

  it('serves a procedure as REST', async () => {
    const response = await handler().handle(new Request(`${BASE_URL}/health`));

    expect(response?.status).toBe(200);
    expect(await response?.json()).toEqual({ status: 'OK' });
  });

  it('serves the same procedure over RPC', async () => {
    const response = await handler().handle(
      new Request(`${BASE_URL}/rpc/index/healthCheck`, { method: 'POST', body: JSON.stringify({}) }),
    );

    expect(response?.status).toBe(200);
  });

  it('returns null for paths no route serves, so adapters can fall through', async () => {
    expect(await handler().handle(new Request(`${BASE_URL}/no-such-route`))).toBeNull();
  });
});

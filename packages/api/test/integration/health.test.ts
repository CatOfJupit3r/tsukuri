import { container } from 'tsyringe';

import { errorCodes } from '@startername/common/generated/error-codes';

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
      new Request(`${BASE_URL}/rpc/index/healthCheck`, {
        method: 'POST',
        headers: { Origin: BASE_URL },
        body: JSON.stringify({}),
      }),
    );

    expect(response?.status).toBe(200);
  });

  it('refuses a state-changing request from a foreign origin before any route runs', async () => {
    const response = await handler().handle(
      new Request(`${BASE_URL}/rpc/index/healthCheck`, {
        method: 'POST',
        headers: { Origin: 'https://evil.example.com' },
        body: JSON.stringify({}),
      }),
    );

    expect(response?.status).toBe(403);
    expect(await response?.json()).toEqual(expect.objectContaining({ code: errorCodes.REQUEST_ORIGIN_NOT_ALLOWED }));
  });

  it('lets a state-changing request without an Origin through in the default lenient mode', async () => {
    const response = await handler().handle(
      new Request(`${BASE_URL}/rpc/index/healthCheck`, { method: 'POST', body: JSON.stringify({}) }),
    );

    expect(response?.status).toBe(200);
  });

  it('returns null for paths no route serves, so adapters can fall through', async () => {
    expect(await handler().handle(new Request(`${BASE_URL}/no-such-route`))).toBeNull();
  });
});

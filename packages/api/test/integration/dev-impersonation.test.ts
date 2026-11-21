import { container } from 'tsyringe';

import { errorCodes } from '@startername/common/generated/error-codes';

import { ApiRequestHandler } from '#~/features/http/api-request-handler';

const BASE_URL = 'http://localhost';
const IMPERSONATE_URL = `${BASE_URL}/dev-tools/impersonate/any-user-id`;

describe('dev impersonation outside development', () => {
  const handler = () => container.resolve(ApiRequestHandler);

  it('answers 404 under the test environment, so tests sign in through the real sign-in flow', async () => {
    const response = await handler().handle(new Request(IMPERSONATE_URL, { method: 'POST' }));

    expect(response?.status).toBe(404);
  });

  it('is covered by the request origin guard, which refuses a foreign origin before the route runs', async () => {
    const response = await handler().handle(
      new Request(IMPERSONATE_URL, { method: 'POST', headers: { Origin: 'https://evil.example.com' } }),
    );

    expect(response?.status).toBe(403);
    expect(await response?.json()).toEqual(expect.objectContaining({ code: errorCodes.REQUEST_ORIGIN_NOT_ALLOWED }));
  });
});

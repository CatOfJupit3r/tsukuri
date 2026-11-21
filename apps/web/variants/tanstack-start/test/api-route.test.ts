import { getRequestIP } from '@tanstack/react-start/server';

import type { iApiRequestOptions } from '@startername/api/features/http/api-request-handler';

import { handleApiRequest } from '#~/routes/api/$';
import { getServerRenderFetch } from '#~/utils/backend-url';

const forwardedRequestOptions: Array<iApiRequestOptions | undefined> = [];

vi.mock('@tanstack/react-start/server', () => ({
  getRequestIP: vi.fn(),
  getRequest: vi.fn(),
  getRequestHeaders: vi.fn(),
}));
vi.mock('@startername/api/start-api', () => ({
  startApi: async () => ({
    handle: async (_request: Request, options?: iApiRequestOptions) => {
      forwardedRequestOptions.push(options);
      return new Response(null, { status: 204 });
    },
  }),
}));

describe('Start API route', () => {
  beforeEach(() => {
    forwardedRequestOptions.length = 0;
  });

  it('hands the shared API the address of the connection each request came from', async () => {
    const request = () => new Request('http://localhost/api/auth/sign-in/email', { method: 'POST' });

    vi.mocked(getRequestIP).mockReturnValueOnce('203.0.113.7');
    await handleApiRequest({ request: request() });
    vi.mocked(getRequestIP).mockReturnValueOnce('198.51.100.9');
    await handleApiRequest({ request: request() });

    expect(forwardedRequestOptions).toEqual([{ clientIp: '203.0.113.7' }, { clientIp: '198.51.100.9' }]);
  });

  it('ignores a forwarded header a client sends', async () => {
    vi.mocked(getRequestIP).mockReturnValueOnce('203.0.113.7');

    await handleApiRequest({
      request: new Request('http://localhost/api/health', { headers: { 'X-Forwarded-For': '198.51.100.9' } }),
    });

    expect(forwardedRequestOptions).toEqual([{ clientIp: '203.0.113.7' }]);
  });

  it('marks a server render lookup as in-process and never marks a request that arrives over the network', async () => {
    vi.mocked(getRequestIP).mockReturnValue('203.0.113.7');

    await getServerRenderFetch()?.('http://localhost/api/auth/get-session');
    await handleApiRequest({
      request: new Request('http://localhost/api/auth/get-session', { headers: { 'X-Server-Render': 'true' } }),
    });

    expect(forwardedRequestOptions).toEqual([
      { clientIp: '203.0.113.7', isServerRender: true },
      { clientIp: '203.0.113.7' },
    ]);
  });
});

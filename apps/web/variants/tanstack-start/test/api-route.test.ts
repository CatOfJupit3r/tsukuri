import { getRequestIP } from '@tanstack/react-start/server';

import { handleApiRequest } from '#~/routes/api/$';

const forwardedRequestOptions: Array<{ clientIp?: string } | undefined> = [];

vi.mock('@tanstack/react-start/server', () => ({ getRequestIP: vi.fn() }));
vi.mock('@startername/api/start-api', () => ({
  startApi: async () => ({
    handle: async (_request: Request, options?: { clientIp?: string }) => {
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
});

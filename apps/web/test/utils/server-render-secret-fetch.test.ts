import { INTERNAL_RENDER_SECRET_HEADER } from '@startername/common/constants/internal-render-secret';

import { createServerRenderSecretFetch } from '#~/utils/server-render-secret-fetch';

const SECRET = 'a-render-secret-of-at-least-32-characters';
const BACKEND_URL = 'http://backend.test';

describe('createServerRenderSecretFetch', () => {
  async function sentHeadersOf(url: string, init?: RequestInit) {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    fetchSpy.mockResolvedValue(new Response(null, { status: 204 }));
    const secretFetch = createServerRenderSecretFetch(SECRET);
    await secretFetch?.(url, init);
    const [sentRequest] = fetchSpy.mock.lastCall ?? [];
    return new Headers(sentRequest instanceof Request ? sentRequest.headers : undefined);
  }

  it("sends the secret on the render's session lookups", async () => {
    const headers = await sentHeadersOf(`${BACKEND_URL}/auth/get-session`);

    expect(headers.get(INTERNAL_RENDER_SECRET_HEADER)).toBe(SECRET);
  });

  it('does not send the secret on any other call', async () => {
    const headers = await sentHeadersOf(`${BACKEND_URL}/auth/sign-in/email`, { method: 'POST', body: '{}' });

    expect(headers.has(INTERNAL_RENDER_SECRET_HEADER)).toBe(false);
  });

  it('replaces a secret header that came from a visitor request', async () => {
    const headers = await sentHeadersOf(`${BACKEND_URL}/auth/get-session`, {
      headers: { [INTERNAL_RENDER_SECRET_HEADER]: 'chosen-by-the-visitor' },
    });

    expect(headers.get(INTERNAL_RENDER_SECRET_HEADER)).toBe(SECRET);
  });

  it('removes a visitor-supplied secret header from calls that do not get the secret', async () => {
    const headers = await sentHeadersOf(`${BACKEND_URL}/auth/sign-out`, {
      method: 'POST',
      headers: { [INTERNAL_RENDER_SECRET_HEADER]: 'chosen-by-the-visitor' },
    });

    expect(headers.has(INTERNAL_RENDER_SECRET_HEADER)).toBe(false);
  });

  it('leaves the render on the plain network when the project has no secret', () => {
    expect(createServerRenderSecretFetch(undefined)).toBeUndefined();
  });
});

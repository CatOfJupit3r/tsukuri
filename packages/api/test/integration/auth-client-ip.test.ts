import { container } from 'tsyringe';

import { AuthService } from '#~/features/auth/auth.service';
import { ApiRequestHandler } from '#~/features/http/api-request-handler';

const BASE_URL = 'http://localhost';
const OBSERVED_ADDRESS = '203.0.113.7';
const FORGED_ADDRESS = '198.51.100.9';

async function signUpAndReadSessionAddress(options: Parameters<ApiRequestHandler['handle']>[1]) {
  const suffix = Math.random().toString(36).slice(2, 8);
  const response = await container.resolve(ApiRequestHandler).handle(
    new Request(`${BASE_URL}/auth/sign-up/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': FORGED_ADDRESS },
      body: JSON.stringify({ email: `ip-${suffix}@example.com`, name: 'Ip User', password: 'password123' }),
    }),
    options,
  );
  const cookie = (response?.headers.getSetCookie() ?? []).map((setCookie) => setCookie.split(';')[0]).join('; ');
  const session = await container
    .resolve(AuthService)
    .getInstance()
    .api.getSession({ headers: new Headers({ cookie }) });
  return session?.session.ipAddress;
}

describe('client address Better Auth keys rate limits on', () => {
  it('is the address the backend observed, not a forwarded header a client forged', async () => {
    expect(await signUpAndReadSessionAddress({ clientIp: OBSERVED_ADDRESS })).toBe(OBSERVED_ADDRESS);
  });

  it('is never a forged header when the backend observed no address', async () => {
    expect(await signUpAndReadSessionAddress({})).not.toBe(FORGED_ADDRESS);
  });
});

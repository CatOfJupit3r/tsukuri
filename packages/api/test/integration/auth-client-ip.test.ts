import { container } from 'tsyringe';

import { AuthService } from '#~/features/auth/auth.service';
import { ApiRequestHandler } from '#~/features/http/api-request-handler';
import { CLIENT_IP_HEADER } from '#~/features/http/client-ip.constants';

const BASE_URL = 'http://localhost';
const OBSERVED_ADDRESS = '203.0.113.7';
const FORGED_ADDRESS = '198.51.100.9';
/** What Better Auth keys on, under test, when no trusted header carries an address. */
const UNTRUSTED_FALLBACK_ADDRESS = '127.0.0.1';

async function signUpAndReadSessionAddress(options: Parameters<ApiRequestHandler['handle']>[1]) {
  const suffix = Math.random().toString(36).slice(2, 8);
  const response = await container.resolve(ApiRequestHandler).handle(
    new Request(`${BASE_URL}/auth/sign-up/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': FORGED_ADDRESS,
        [CLIENT_IP_HEADER]: FORGED_ADDRESS,
      },
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

  it('has no address when the backend observed none, even if a client forged the address header', async () => {
    expect(await signUpAndReadSessionAddress({})).toBe(UNTRUSTED_FALLBACK_ADDRESS);
  });
});

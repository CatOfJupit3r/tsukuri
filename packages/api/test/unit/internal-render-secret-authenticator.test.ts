import { INTERNAL_RENDER_SECRET_HEADER } from '@startername/common/constants/internal-render-secret';

import { env } from '#~/constants/env';
import { InternalRenderSecretAuthenticator } from '#~/features/render-secret/internal-render-secret.authenticator';

function requestWithSecret(secret?: string) {
  return new Request('http://localhost/auth/get-session', {
    headers: secret === undefined ? {} : { [INTERNAL_RENDER_SECRET_HEADER]: secret },
  });
}

describe('InternalRenderSecretAuthenticator', () => {
  const authenticator = new InternalRenderSecretAuthenticator();

  it('accepts the shared secret', () => {
    expect(authenticator.isAuthentic(requestWithSecret(env.INTERNAL_RENDER_SECRET))).toBe(true);
  });

  it.each([
    ['a wrong secret', 'not-the-shared-secret'],
    ['a shorter secret', 'x'],
    ['an empty secret', ''],
  ])('rejects %s', (_label, secret) => {
    expect(authenticator.isAuthentic(requestWithSecret(secret))).toBe(false);
  });

  it('rejects a request without the header', () => {
    expect(authenticator.isAuthentic(requestWithSecret())).toBe(false);
  });
});

import { container } from 'tsyringe';

import { NODE_ENVIRONMENTS } from '#~/constants/node-environments.enums';
import { registerServices } from '#~/di/register-services';
import { AuthService } from '#~/features/auth/auth.service';
import { DEV_IMPERSONATE_PATH, handleDevImpersonateRequest } from '#~/features/auth/dev-impersonate.http';

// Production config: the env a deployment gets, including one that never set NODE_ENV (it defaults to production).
vi.mock('#~/constants/env', async (importOriginal) => {
  const original = await importOriginal<typeof import('#~/constants/env')>();
  return { env: { ...original.env, NODE_ENV: NODE_ENVIRONMENTS.PRODUCTION } };
});

describe('dev impersonation under production config', () => {
  beforeAll(async () => {
    await registerServices();
  });

  it('answers 404 on the impersonation route without touching auth', async () => {
    const response = await handleDevImpersonateRequest(
      new Request(`http://localhost${DEV_IMPERSONATE_PATH}/any-user-id`),
    );

    expect(response.status).toBe(404);
  });

  it('leaves the impersonation endpoint out of Better Auth', () => {
    const auth = container.resolve(AuthService).getInstance();

    expect(Object.keys(auth.api)).not.toContain('devImpersonateUser');
    expect(Object.keys(auth.api)).toContain('signInEmail');
  });
});

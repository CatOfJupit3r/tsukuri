import { env } from '#~/constants/env';
import { NODE_ENVIRONMENTS } from '#~/constants/node-environments.enums';
import { AuthSecretTask } from '#~/features/auth/auth-secret.task';
import { BETTER_AUTH_SECRET_PLACEHOLDER } from '#~/features/auth/auth.constants';

describe('AuthSecretTask', () => {
  const originalEnvironment = env.NODE_ENV;
  const originalSecret = env.BETTER_AUTH_SECRET;

  afterEach(() => {
    env.NODE_ENV = originalEnvironment;
    env.BETTER_AUTH_SECRET = originalSecret;
  });

  it('refuses the placeholder secret in production with a clear error', async () => {
    env.NODE_ENV = NODE_ENVIRONMENTS.PRODUCTION;
    env.BETTER_AUTH_SECRET = BETTER_AUTH_SECRET_PLACEHOLDER;

    await expect(new AuthSecretTask().run()).rejects.toThrow('BETTER_AUTH_SECRET is still the placeholder');
  });

  it('accepts a real secret in production', async () => {
    env.NODE_ENV = NODE_ENVIRONMENTS.PRODUCTION;
    env.BETTER_AUTH_SECRET = 'a-random-secret-that-is-not-the-placeholder';

    await expect(new AuthSecretTask().run()).resolves.toBeUndefined();
  });

  it('leaves the placeholder alone outside production, where tests and local runs use it', async () => {
    env.NODE_ENV = NODE_ENVIRONMENTS.TEST;
    env.BETTER_AUTH_SECRET = BETTER_AUTH_SECRET_PLACEHOLDER;

    await expect(new AuthSecretTask().run()).resolves.toBeUndefined();
  });
});

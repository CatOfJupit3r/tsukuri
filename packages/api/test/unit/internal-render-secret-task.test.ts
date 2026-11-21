import { env } from '#~/constants/env';
import { NODE_ENVIRONMENTS } from '#~/constants/node-environments.enums';
import { INTERNAL_RENDER_SECRET_PLACEHOLDER } from '#~/features/render-secret/internal-render-secret.constants';
import { InternalRenderSecretTask } from '#~/features/render-secret/internal-render-secret.task';

describe('InternalRenderSecretTask', () => {
  const originalEnvironment = env.NODE_ENV;
  const originalSecret = env.INTERNAL_RENDER_SECRET;

  afterEach(() => {
    env.NODE_ENV = originalEnvironment;
    env.INTERNAL_RENDER_SECRET = originalSecret;
  });

  it('refuses the placeholder secret in production with a clear error', async () => {
    env.NODE_ENV = NODE_ENVIRONMENTS.PRODUCTION;
    env.INTERNAL_RENDER_SECRET = INTERNAL_RENDER_SECRET_PLACEHOLDER;

    await expect(new InternalRenderSecretTask().run()).rejects.toThrow(
      'INTERNAL_RENDER_SECRET is still the placeholder',
    );
  });

  it('accepts a real secret in production', async () => {
    env.NODE_ENV = NODE_ENVIRONMENTS.PRODUCTION;
    env.INTERNAL_RENDER_SECRET = 'a-random-secret-that-is-not-the-placeholder';

    await expect(new InternalRenderSecretTask().run()).resolves.toBeUndefined();
  });

  it('leaves the placeholder alone outside production, where tests and local runs use it', async () => {
    env.NODE_ENV = NODE_ENVIRONMENTS.TEST;
    env.INTERNAL_RENDER_SECRET = INTERNAL_RENDER_SECRET_PLACEHOLDER;

    await expect(new InternalRenderSecretTask().run()).resolves.toBeUndefined();
  });
});

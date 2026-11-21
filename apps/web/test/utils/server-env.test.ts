import { assertServerEnv } from '#~/utils/server-env';

const VALID_ENVIRONMENT = {
  INTERNAL_RENDER_SECRET: 'a-render-secret-of-at-least-32-characters',
  VITE_SERVER_URL: 'http://backend.test',
};

describe('assertServerEnv', () => {
  it('refuses to start the server render without the shared secret', () => {
    expect(() => assertServerEnv({ VITE_SERVER_URL: VALID_ENVIRONMENT.VITE_SERVER_URL })).toThrow(
      /INTERNAL_RENDER_SECRET/,
    );
  });

  it('refuses a secret that is too short', () => {
    expect(() => assertServerEnv({ ...VALID_ENVIRONMENT, INTERNAL_RENDER_SECRET: 'short' })).toThrow(
      /INTERNAL_RENDER_SECRET/,
    );
  });

  it('accepts the server-only variables without the build variables', () => {
    expect(assertServerEnv(VALID_ENVIRONMENT)).toEqual(VALID_ENVIRONMENT);
  });
});

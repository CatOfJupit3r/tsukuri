import { container } from 'tsyringe';
import z from 'zod';

import { errorCodes } from '@startername/common/generated/error-codes';

import { env } from '#~/constants/env';
import { NODE_ENVIRONMENTS } from '#~/constants/node-environments.enums';
import { AuthPasswordHasher } from '#~/features/auth/auth-password-hasher';
import { AuthService } from '#~/features/auth/auth.service';
import { KEY_VALUE_STORE_TOKEN } from '#~/features/cache/key-value-store';
import { DatabaseService } from '#~/features/database/database.service';
import { EventBus } from '#~/features/events/event-bus';
import { ApiRequestHandler } from '#~/features/http/api-request-handler';
import { ServerRenderRequestRegistry } from '#~/features/http/server-render-request.registry';
import { LoggerFactory } from '#~/features/logger/logger.factory';
import { RequestContextStorage } from '#~/features/request-context/request-context.storage';

const BASE_URL = 'http://localhost';
const SESSION_COOKIE_PREFIX = 'better-auth.session_token=';

describe('dev impersonation', () => {
  const handler = () => container.resolve(ApiRequestHandler);

  async function signUpUserId() {
    const suffix = Math.random().toString(36).slice(2, 8);
    const response = await handler().handle(
      new Request(`${BASE_URL}/auth/sign-up/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `impersonate-${suffix}@example.com`,
          name: 'Target User',
          password: 'password123',
        }),
      }),
    );
    const body = z.object({ user: z.object({ id: z.string() }) }).parse(await response?.json());
    return body.user.id;
  }

  function impersonate(userId: string, headers: Record<string, string> = {}) {
    return handler().handle(new Request(`${BASE_URL}/dev-tools/impersonate/${userId}`, { method: 'POST', headers }));
  }

  describe('under the test environment', () => {
    it('answers 404 for a user that exists, so tests sign in through the real sign-in flow', async () => {
      const response = await impersonate(await signUpUserId());

      expect(response?.status).toBe(404);
      expect(response?.headers.get('set-cookie')).toBeNull();
    });

    it('is covered by the request origin guard, which refuses a foreign origin before the route runs', async () => {
      const response = await impersonate('any-user-id', { Origin: 'https://evil.example.com' });

      expect(response?.status).toBe(403);
      expect(await response?.json()).toEqual(expect.objectContaining({ code: errorCodes.REQUEST_ORIGIN_NOT_ALLOWED }));
    });
  });

  describe('under the development environment', () => {
    const originalEnvironment = env.NODE_ENV;
    const originalAuthService = container.resolve(AuthService);

    beforeEach(() => {
      env.NODE_ENV = NODE_ENVIRONMENTS.DEVELOPMENT;
      // Whether the endpoint exists is decided when Better Auth is created, so this one is created in development.
      container.registerInstance(
        AuthService,
        new AuthService(
          container.resolve(LoggerFactory),
          container.resolve(DatabaseService),
          container.resolve(EventBus),
          container.resolve(RequestContextStorage),
          container.resolve(AuthPasswordHasher),
          container.resolve(ServerRenderRequestRegistry),
          container.resolve(KEY_VALUE_STORE_TOKEN),
        ),
      );
    });

    afterEach(() => {
      env.NODE_ENV = originalEnvironment;
      container.registerInstance(AuthService, originalAuthService);
    });

    it('signs in as the requested user', async () => {
      const userId = await signUpUserId();

      const response = await impersonate(userId);

      expect(response?.status).toBe(200);
      expect(response?.headers.get('set-cookie')).toContain(SESSION_COOKIE_PREFIX);
      expect(await response?.json()).toMatchObject({ user: { id: userId }, session: { userId } });
    });
  });
});

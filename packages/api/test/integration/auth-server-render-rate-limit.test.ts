import { container } from 'tsyringe';

import { INTERNAL_RENDER_SECRET_HEADER } from '@startername/common/constants/internal-render-secret';

import { env } from '#~/constants/env';
import { NODE_ENVIRONMENTS } from '#~/constants/node-environments.enums';
import { AuthPasswordHasher } from '#~/features/auth/auth-password-hasher';
import { AuthService } from '#~/features/auth/auth.service';
import type { iKeyValueStore } from '#~/features/cache/key-value-store';
import { KEY_VALUE_STORE_TOKEN } from '#~/features/cache/key-value-store';
import { DatabaseService } from '#~/features/database/database.service';
import { EventBus } from '#~/features/events/event-bus';
import { ApiRequestHandler } from '#~/features/http/api-request-handler';
import { CLIENT_IP_HEADER } from '#~/features/http/client-ip.constants';
import { RequestOriginGuard } from '#~/features/http/request-origin.guard';
import { ServerRenderRequestRegistry } from '#~/features/http/server-render-request.registry';
import { LoggerFactory } from '#~/features/logger/logger.factory';
import { InternalRenderSecretAuthenticator } from '#~/features/render-secret/internal-render-secret.authenticator';
import { RequestContextStorage } from '#~/features/request-context/request-context.storage';

const BASE_URL = 'http://localhost';
const SESSION_LOOKUPS_BEYOND_THE_LIMIT = 120;
const SESSION_LOOKUP_LIMIT = 100;
const TOO_MANY_REQUESTS_STATUS = 429;

function sessionLookup() {
  return new Request(`${BASE_URL}/auth/get-session`, { headers: { 'X-Server-Render': 'true' } });
}

function signInAttempt() {
  return new Request(`${BASE_URL}/auth/sign-in/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'nobody@example.com', password: 'password123' }),
  });
}

async function statusesOf(
  requests: Request[],
  options: Parameters<ApiRequestHandler['handle']>[1],
  handler = container.resolve(ApiRequestHandler),
) {
  const statuses: Array<number | undefined> = [];
  for (const request of requests) statuses.push((await handler.handle(request, options))?.status);
  return statuses;
}

function createHandlerVerifyingTheRenderSecret() {
  return new ApiRequestHandler(
    container.resolve(LoggerFactory),
    container.resolve(RequestContextStorage),
    container.resolve(RequestOriginGuard),
    container.resolve(ServerRenderRequestRegistry),
    new InternalRenderSecretAuthenticator(),
  );
}

function lookupWithSecret(secret?: string) {
  const headers = new Headers();
  if (secret !== undefined) headers.set(INTERNAL_RENDER_SECRET_HEADER, secret);
  return new Request(`${BASE_URL}/auth/get-session`, { headers });
}

function signInWithSecret() {
  const request = signInAttempt();
  request.headers.set(INTERNAL_RENDER_SECRET_HEADER, env.INTERNAL_RENDER_SECRET);
  return request;
}

function createAuthServiceCountingRequests() {
  const originalEnvironment = env.NODE_ENV;
  // Rate limits count requests only in production, and the instance reads that when it is created.
  env.NODE_ENV = NODE_ENVIRONMENTS.PRODUCTION;
  try {
    const authService = new AuthService(
      container.resolve(LoggerFactory),
      container.resolve(DatabaseService),
      container.resolve(EventBus),
      container.resolve(RequestContextStorage),
      container.resolve(AuthPasswordHasher),
      container.resolve(ServerRenderRequestRegistry),
      container.resolve<iKeyValueStore>(KEY_VALUE_STORE_TOKEN),
    );
    authService.getInstance();
    return authService;
  } finally {
    env.NODE_ENV = originalEnvironment;
  }
}

describe('rate limits on session lookups', () => {
  const originalAuthService = container.resolve(AuthService);

  beforeAll(() => {
    container.registerInstance(AuthService, createAuthServiceCountingRequests());
  });

  afterAll(() => {
    container.registerInstance(AuthService, originalAuthService);
  });

  it('lets the server render look sessions up far beyond the per-address limit', async () => {
    const statuses = await statusesOf(Array.from({ length: SESSION_LOOKUPS_BEYOND_THE_LIMIT }, sessionLookup), {
      clientIp: '203.0.113.50',
      isServerRender: true,
    });

    expect(statuses.filter((status) => status === TOO_MANY_REQUESTS_STATUS)).toEqual([]);
  });

  it('still limits a visitor whose request carries the same headers the server render sends', async () => {
    const statuses = await statusesOf(Array.from({ length: SESSION_LOOKUPS_BEYOND_THE_LIMIT }, sessionLookup), {
      clientIp: '203.0.113.51',
    });

    expect(statuses.filter((status) => status === TOO_MANY_REQUESTS_STATUS).length).toBe(
      SESSION_LOOKUPS_BEYOND_THE_LIMIT - SESSION_LOOKUP_LIMIT,
    );
  });

  it('keeps the limit on sign-in even for the server render', async () => {
    const statuses = await statusesOf(Array.from({ length: 6 }, signInAttempt), {
      clientIp: '203.0.113.52',
      isServerRender: true,
    });

    expect(statuses).toContain(TOO_MANY_REQUESTS_STATUS);
  });

  it('does not let a visitor choose the address the limit counts', async () => {
    const forged = Array.from({ length: SESSION_LOOKUPS_BEYOND_THE_LIMIT }, () => {
      const request = sessionLookup();
      request.headers.set(CLIENT_IP_HEADER, `198.51.100.${Math.floor(Math.random() * 200)}`);
      return request;
    });

    const statuses = await statusesOf(forged, { clientIp: '203.0.113.53' });

    expect(statuses).toContain(TOO_MANY_REQUESTS_STATUS);
  });

  describe('from a web app in another process', () => {
    const handler = createHandlerVerifyingTheRenderSecret();
    const lookupsBeyondTheLimit = (createRequest: () => Request) =>
      Array.from({ length: SESSION_LOOKUPS_BEYOND_THE_LIMIT }, createRequest);
    const limitedCount = (statuses: Array<number | undefined>) =>
      statuses.filter((status) => status === TOO_MANY_REQUESTS_STATUS).length;

    it('lets session lookups carrying the shared secret run far beyond the per-address limit', async () => {
      const statuses = await statusesOf(
        lookupsBeyondTheLimit(() => lookupWithSecret(env.INTERNAL_RENDER_SECRET)),
        { clientIp: '203.0.113.60' },
        handler,
      );

      expect(limitedCount(statuses)).toBe(0);
    });

    it.each([
      ['a wrong secret', 'wrong-secret'],
      ['no secret', undefined],
    ])('limits session lookups carrying %s like any visitor', async (_label, secret) => {
      const statuses = await statusesOf(
        lookupsBeyondTheLimit(() => lookupWithSecret(secret)),
        { clientIp: secret === undefined ? '203.0.113.62' : '203.0.113.61' },
        handler,
      );

      expect(limitedCount(statuses)).toBe(SESSION_LOOKUPS_BEYOND_THE_LIMIT - SESSION_LOOKUP_LIMIT);
    });

    it('keeps the limit on sign-in even when the request carries the shared secret', async () => {
      const statuses = await statusesOf(
        Array.from({ length: 6 }, signInWithSecret),
        { clientIp: '203.0.113.63' },
        handler,
      );

      expect(limitedCount(statuses)).toBeGreaterThan(0);
    });
  });
});

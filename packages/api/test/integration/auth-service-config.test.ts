import { container } from 'tsyringe';

import { env } from '#~/constants/env';
import { AuthPasswordHasher } from '#~/features/auth/auth-password-hasher';
import { AUTH_SESSION_STORES } from '#~/features/auth/auth-session-stores.enums';
import { AuthService } from '#~/features/auth/auth.service';
import type { iKeyValueStore } from '#~/features/cache/key-value-store';
import { DatabaseService } from '#~/features/database/database.service';
import { EventBus } from '#~/features/events/event-bus';
import { ServerRenderRequestRegistry } from '#~/features/http/server-render-request.registry';
import { LoggerFactory } from '#~/features/logger/logger.factory';
import { RequestContextStorage } from '#~/features/request-context/request-context.storage';

const FORWARDED_ADDRESS = '198.51.100.9';

/** An eventually consistent store, like Cloudflare KV, that remembers every write. */
function createEventuallyConsistentStore() {
  const entries = new Map<string, string>();
  const store = {
    isConnected: true,
    isStronglyConsistent: false,
    minimumTtlSeconds: 60,
    get: async (key: string) => entries.get(key) ?? null,
    set: async (key: string, value: string) => {
      entries.set(key, value);
    },
    delete: async (key: string) => {
      entries.delete(key);
    },
    deleteMatching: async () => {},
  } satisfies iKeyValueStore;
  return { store, entries };
}

function createAuthService(store: iKeyValueStore) {
  return new AuthService(
    container.resolve(LoggerFactory),
    container.resolve(DatabaseService),
    container.resolve(EventBus),
    container.resolve(RequestContextStorage),
    container.resolve(AuthPasswordHasher),
    container.resolve(ServerRenderRequestRegistry),
    store,
  );
}

async function signUp(authService: AuthService, headers: Record<string, string> = {}) {
  const suffix = Math.random().toString(36).slice(2, 8);
  const response = await authService.getInstance().handler(
    new Request('http://localhost/auth/sign-up/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ email: `config-${suffix}@example.com`, name: 'Config User', password: 'password123' }),
    }),
  );
  return (response.headers.getSetCookie() ?? []).map((setCookie) => setCookie.split(';')[0]).join('; ');
}

describe('AuthService session store on an eventually consistent store', () => {
  afterEach(() => {
    env.AUTH_SESSION_STORE = AUTH_SESSION_STORES.DATABASE;
  });

  it('keeps sessions only in the database by default, so a revoked session stops working at once', async () => {
    const { store, entries } = createEventuallyConsistentStore();

    await signUp(createAuthService(store));

    expect(entries.size).toBe(0);
  });

  it('also caches sessions in the store when the project chose the KV session cache', async () => {
    env.AUTH_SESSION_STORE = AUTH_SESSION_STORES.KV_CACHE;
    const { store, entries } = createEventuallyConsistentStore();

    await signUp(createAuthService(store));

    expect([...entries.keys()].length).toBeGreaterThan(0);
  });
});

describe('AuthService trusted IP header', () => {
  afterEach(() => {
    env.TRUSTED_IP_HEADER = undefined;
  });

  async function readSessionAddress(authService: AuthService, cookie: string) {
    const session = await authService.getInstance().api.getSession({ headers: new Headers({ cookie }) });
    return session?.session.ipAddress;
  }

  it('ignores X-Forwarded-For by default', async () => {
    const authService = createAuthService(createEventuallyConsistentStore().store);

    const cookie = await signUp(authService, { 'X-Forwarded-For': FORWARDED_ADDRESS });

    expect(await readSessionAddress(authService, cookie)).not.toBe(FORWARDED_ADDRESS);
  });

  it('counts the header TRUSTED_IP_HEADER names', async () => {
    env.TRUSTED_IP_HEADER = 'x-forwarded-for';
    const authService = createAuthService(createEventuallyConsistentStore().store);

    const cookie = await signUp(authService, { 'X-Forwarded-For': FORWARDED_ADDRESS });

    expect(await readSessionAddress(authService, cookie)).toBe(FORWARDED_ADDRESS);
  });
});

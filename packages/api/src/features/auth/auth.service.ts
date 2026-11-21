import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { betterAuth } from 'better-auth';
import { username } from 'better-auth/plugins';
import { inject, singleton } from 'tsyringe';

import { env } from '#~/constants/env';
import { NODE_ENVIRONMENT_META } from '#~/constants/node-environments.enums';
import {
  accounts,
  accountsRelations,
  rateLimits,
  sessions,
  sessionsRelations,
  users,
  usersRelations,
  verifications,
} from '#~/features/auth/auth.schema';
import type { iKeyValueStore } from '#~/features/cache/key-value-store';
import { KEY_VALUE_STORE_TOKEN } from '#~/features/cache/key-value-store';
import { DATABASE_DIALECT } from '#~/features/database/database.constants';
import { DatabaseService } from '#~/features/database/database.service';
import { EventBus } from '#~/features/events/event-bus';
import { CLIENT_IP_HEADER } from '#~/features/http/client-ip.constants';
import { ServerRenderRequestRegistry } from '#~/features/http/server-render-request.registry';
import { LoggerFactory } from '#~/features/logger/logger.factory';
import type { iWithLogger, LoggerType } from '#~/features/logger/logger.types';
import { RequestContextStorage } from '#~/features/request-context/request-context.storage';

import { AuthPasswordHasher } from './auth-password-hasher';
import { AUTH_SESSION_STORES } from './auth-session-stores.enums';
import { UserAfterRegisteredListener } from './auth.listeners';
import { devImpersonatePlugin } from './better-auth-plugins/dev-impersonate.plugin';

const AUTH_BASE_PATH = '/auth';
const SESSION_LOOKUP_PATH = '/get-session';

type iAuthInstance = ReturnType<AuthService['createInstance']>;

@singleton()
export class AuthService implements iWithLogger {
  public readonly logger: LoggerType;

  /**
   * One instance per database handle: a single one where the database is shared (a Node pool, D1), one per
   * request where every request has its own connections (Postgres through Hyperdrive on a Worker).
   */
  private readonly instances = new WeakMap<object, iAuthInstance>();

  constructor(
    loggerFactory: LoggerFactory,
    private readonly databaseService: DatabaseService,
    private readonly eventBus: EventBus,
    private readonly requestContextStorage: RequestContextStorage,
    private readonly passwordHasher: AuthPasswordHasher,
    private readonly serverRenderRequestRegistry: ServerRenderRequestRegistry,
    @inject(KEY_VALUE_STORE_TOKEN) private readonly keyValueStore: iKeyValueStore,
  ) {
    this.logger = loggerFactory.create('auth');
  }

  /** Created on first use, after every startup task ran, so a connected key-value store holds the sessions. */
  public getInstance() {
    const database = this.databaseService.getDb();
    const existing = this.instances.get(database);
    if (existing) return existing;

    const instance = this.createInstance(database);
    this.instances.set(database, instance);
    return instance;
  }

  private createInstance(database: ReturnType<DatabaseService['getDb']>) {
    const isStoreConnected = this.keyValueStore.isConnected;
    const isStoreStronglyConsistent = isStoreConnected && this.keyValueStore.isStronglyConsistent;
    // A strongly consistent store (Valkey) is always the session store. An eventually consistent one (KV) only
    // caches sessions when the project chose the KV session cache; by default the database alone holds them.
    const isSessionStoreUsed =
      isStoreConnected && (isStoreStronglyConsistent || env.AUTH_SESSION_STORE === AUTH_SESSION_STORES.KV_CACHE);
    const isSessionAlsoInDatabase = isSessionStoreUsed && !isStoreStronglyConsistent;

    return betterAuth({
      database: drizzleAdapter(database, {
        provider: DATABASE_DIALECT,
        schema: {
          users,
          usersRelations,
          sessions,
          sessionsRelations,
          accounts,
          accountsRelations,
          verifications,
          rateLimits,
        },
        usePlural: true,
      }),
      secret: env.BETTER_AUTH_SECRET,
      trustedOrigins: env.TRUSTED_ORIGINS,
      plugins: [
        username(),
        ...(NODE_ENVIRONMENT_META.get(env.NODE_ENV).allowsDevelopmentTools ? [devImpersonatePlugin()] : []),
      ],
      secondaryStorage: isSessionStoreUsed ? this.createSecondaryStorage() : undefined,
      // The database stays the source of truth, so the cache never holds the only copy. A revoked or signed-out
      // session can still be read from an eventually consistent cache for about a minute.
      session: { storeSessionInDatabase: isSessionAlsoInDatabase },
      verification: { storeInDatabase: isSessionAlsoInDatabase },
      rateLimit: {
        enabled: NODE_ENVIRONMENT_META.get(env.NODE_ENV).hasRateLimits,
        // Counters change on every request: only a strongly consistent shared store can hold them.
        storage: isStoreStronglyConsistent ? 'secondary-storage' : 'database',
        // The server render looks the session up for every page it renders on behalf of different visitors; those
        // in-process lookups are read-only and skip the per-address limit. Writes keep their per-visitor limits.
        customRules: {
          [SESSION_LOOKUP_PATH]: (request, currentRule) =>
            this.serverRenderRequestRegistry.isMarked(request) ? false : currentRule,
        },
      },
      emailAndPassword: {
        enabled: true,
        password: {
          hash: async (password) => this.passwordHasher.hash(password),
          verify: async (verification) => this.passwordHasher.verify(verification),
        },
      },
      telemetry: {
        enabled: false,
      },
      basePath: AUTH_BASE_PATH,
      advanced: {
        // Rate limits key on the address the adapter observed, or on `TRUSTED_IP_HEADER` behind a proxy that sets it.
        ipAddress: { ipAddressHeaders: [env.TRUSTED_IP_HEADER ?? CLIENT_IP_HEADER] },
        // Pruning of expired rate-limit rows runs inside the request lifetime, while the request's connections are open.
        backgroundTasks: { handler: (promise) => this.runInBackground(promise) },
        database: {
          generateId: 'uuid',
        },
        defaultCookieAttributes: {
          sameSite: env.AUTH_COOKIE_SAME_SITE,
          secure: env.AUTH_COOKIE_SECURE,
          httpOnly: true,
        },
      },
      experimental: {
        joins: false,
      },
      databaseHooks: {
        user: {
          create: {
            after: async (user) => {
              await this.eventBus.emitAsync(UserAfterRegisteredListener, { userId: user.id });
            },
          },
        },
      },
    });
  }

  private runInBackground(promise: Promise<unknown>) {
    const waitUntil = this.requestContextStorage.current()?.waitUntil;
    if (waitUntil) waitUntil(promise);
    else void promise.catch((error: unknown) => this.logger.error('Background auth task failed', { error }));
  }

  private createSecondaryStorage() {
    return {
      get: async (key: string) => this.keyValueStore.get(key),
      // A session or verification close to expiry may get a TTL below the store's minimum. Both carry their
      // own expiry, which Better Auth checks when it reads them, so keeping them a little longer is harmless.
      set: async (key: string, value: string, ttl?: number) =>
        this.keyValueStore.set(
          key,
          value,
          ttl === undefined ? ttl : Math.max(ttl, this.keyValueStore.minimumTtlSeconds),
        ),
      delete: async (key: string) => this.keyValueStore.delete(key),
    };
  }
}

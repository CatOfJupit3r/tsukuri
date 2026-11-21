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
import { LoggerFactory } from '#~/features/logger/logger.factory';
import type { iWithLogger, LoggerType } from '#~/features/logger/logger.types';

import { AuthPasswordHasher } from './auth-password-hasher';
import { UserAfterRegisteredListener } from './auth.listeners';
import { devImpersonatePlugin } from './better-auth-plugins/dev-impersonate.plugin';

const AUTH_BASE_PATH = '/auth';

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
    private readonly passwordHasher: AuthPasswordHasher,
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
    const hasSharedStore = this.keyValueStore.isConnected && this.keyValueStore.isStronglyConsistent;
    const hasEventuallyConsistentStore = this.keyValueStore.isConnected && !this.keyValueStore.isStronglyConsistent;

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
      secondaryStorage: this.keyValueStore.isConnected ? this.createSecondaryStorage() : undefined,
      // An eventually consistent store (KV) may not show a write elsewhere for a minute, so sessions and
      // verifications are also kept in the database, which stays their source of truth.
      session: { storeSessionInDatabase: hasEventuallyConsistentStore },
      verification: { storeInDatabase: hasEventuallyConsistentStore },
      rateLimit: {
        // Counters change on every request: only a strongly consistent shared store can hold them.
        storage: hasSharedStore ? 'secondary-storage' : 'database',
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

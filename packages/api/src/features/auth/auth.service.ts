import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { betterAuth } from 'better-auth';
import { username } from 'better-auth/plugins';
import { inject, singleton } from 'tsyringe';

import { env } from '#~/constants/env';
import type { iKeyValueStore } from '#~/features/cache/key-value-store';
import { KEY_VALUE_STORE_TOKEN } from '#~/features/cache/key-value-store';
import { DATABASE_DIALECT } from '#~/features/database/database.constants';
import { DatabaseService } from '#~/features/database/database.service';
import { EventBus } from '#~/features/events/event-bus';
import { LoggerFactory } from '#~/features/logger/logger.factory';
import type { iWithLogger, LoggerType } from '#~/features/logger/logger.types';

import { AuthPasswordHasher } from './auth-password-hasher';
import { UserAfterRegisteredListener } from './auth.listeners';
import {
  accounts,
  accountsRelations,
  sessions,
  sessionsRelations,
  users,
  usersRelations,
  verifications,
} from './auth.schema';
import { devImpersonatePlugin } from './better-auth-plugins/dev-impersonate.plugin';

const AUTH_BASE_PATH = '/auth';

@singleton()
export class AuthService implements iWithLogger {
  public readonly logger: LoggerType;

  private instance: ReturnType<AuthService['createInstance']> | null = null;

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
    this.instance ??= this.createInstance();
    return this.instance;
  }

  private createInstance() {
    return betterAuth({
      database: drizzleAdapter(this.databaseService.getDb(), {
        provider: DATABASE_DIALECT,
        schema: { users, usersRelations, sessions, sessionsRelations, accounts, accountsRelations, verifications },
        usePlural: true,
      }),
      secret: env.BETTER_AUTH_SECRET,
      trustedOrigins: [process.env.CORS_ORIGIN ?? ''],
      plugins: [username(), devImpersonatePlugin()],
      secondaryStorage: this.keyValueStore.isConnected ? this.createSecondaryStorage() : undefined,
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
      set: async (key: string, value: string, ttl?: number) => this.keyValueStore.set(key, value, ttl),
      delete: async (key: string) => this.keyValueStore.delete(key),
    };
  }
}

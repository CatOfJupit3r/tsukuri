import Redis from 'ioredis';
import { singleton } from 'tsyringe';

import { errorCodes, errorMessages } from '@startername/common/generated/error-codes';

import { env } from '#~/constants/env';
import { NODE_ENVIRONMENTS } from '#~/constants/node-environments.enums';
import { LoggerFactory } from '#~/features/logger/logger.factory';
import type { iWithLogger, LoggerType } from '#~/features/logger/logger.types';
import { UnexpectedServerError } from '#~/lib/orpc-error-wrapper';

@singleton()
export class ValkeyService implements iWithLogger {
  public readonly logger: LoggerType;

  private client: Redis | Nil = null;

  public constructor(loggerFactory: LoggerFactory) {
    this.logger = loggerFactory.create('valkey');
  }

  public get isConnected() {
    return this.client !== null;
  }

  public async connect() {
    if (this.client) return this.client;
    if (env.NODE_ENV === NODE_ENVIRONMENTS.TEST) {
      this.logger.info('Valkey connection skipped in test environment');
      return null;
    }

    this.client = new Redis({
      host: env.VALKEY_HOST,
      port: env.VALKEY_PORT,
      username: env.VALKEY_USERNAME,
      password: env.VALKEY_PASSWORD,
      db: env.VALKEY_DB,
    });

    this.client.on('error', (error) => {
      this.logger.error('Valkey connection error', { error });
    });

    this.client.on('connect', () => {
      this.logger.info('Valkey connected');
    });

    await this.client.ping();
    return this.client;
  }

  public getClient() {
    if (!this.client) throw new UnexpectedServerError(errorMessages.get(errorCodes.VALKEY_CLIENT_NOT_CONNECTED));
    return this.client;
  }

  public async disconnect() {
    if (!this.client) return;
    await this.client.quit();
    this.client = null;
  }
}

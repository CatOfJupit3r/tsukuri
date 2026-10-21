import { singleton } from 'tsyringe';

import { env } from '#~/constants/env';
import { NODE_ENVIRONMENTS } from '#~/constants/node-environments.enums';
import { RequestContextStorage } from '#~/features/request-context/request-context.storage';

import { Logger } from './logger';

/**
 * Factory for creating loggers with namespaces.
 *
 * Uses a single global Logger instance and creates child loggers
 * with proper namespace inheritance.
 *
 * @example
 * const factory = container.resolve(LoggerFactory);
 * const apiLogger = factory.create('api');        // namespace: 'api'
 * const usersLogger = apiLogger.child('users');   // namespace: 'api:users'
 */
@singleton()
export class LoggerFactory {
  private readonly instance: Logger;

  public constructor(requestContext: RequestContextStorage) {
    this.instance = new Logger({
      colorize: env.NODE_ENV !== NODE_ENVIRONMENTS.PRODUCTION,
      requestContext,
    });
  }

  /**
   * Create a new logger with the given namespace.
   * Returns a Logger instance that properly maintains the namespace.
   */
  public create(namespace: string): Logger {
    return this.instance.child(namespace);
  }

  /**
   * Get the root global logger instance.
   * Prefer using create() with a namespace for better log organization.
   */
  public global(): Logger {
    return this.instance;
  }
}

import winston from 'winston';

import { env } from '#~/constants/env';
import { NODE_ENVIRONMENTS } from '#~/constants/node-environments.enums';
import type { RequestContextStorage } from '#~/features/request-context/request-context.storage';

import { WINSTON_LOGGER_FORMAT } from './logger.helpers';

interface iLoggerConfig {
  requestContext: RequestContextStorage;
  colorize?: boolean;
  /** Child loggers share their parent's Winston instance under their own namespace. */
  namespace?: string;
  winstonLogger?: winston.Logger;
}

/**
 * Global Winston logger instance - created once and shared across all child loggers.
 * Child loggers inherit from this instance but have their own namespace.
 */
let globalWinstonLogger: winston.Logger | null = null;

function getOrCreateGlobalLogger(colorize: boolean): winston.Logger {
  const isTest = env.NODE_ENV === NODE_ENVIRONMENTS.TEST;
  const configuredLevel = process.env.LOG_LEVEL;

  let level: string;
  if (configuredLevel) {
    level = configuredLevel;
  } else if (env.NODE_ENV === NODE_ENVIRONMENTS.PRODUCTION) {
    level = 'info';
  } else if (isTest) {
    level = 'error';
  } else {
    level = 'debug';
  }

  const shouldSilence = isTest && (configuredLevel === 'silent' || level === 'silent');

  globalWinstonLogger ??= winston.createLogger({
    level: shouldSilence ? 'error' : level,
    silent: shouldSilence,
    format: WINSTON_LOGGER_FORMAT(colorize),
    transports: [new winston.transports.Console({ silent: shouldSilence })],
  });
  return globalWinstonLogger;
}

/**
 * Logger wrapper class that provides namespacing and automatic userId injection.
 *
 * Uses a single global Winston instance for consistency, with child loggers
 * maintaining their own namespace hierarchy.
 *
 * Request context (userId, requestId) is automatically injected via AsyncLocalStorage.
 */
export class Logger {
  private winstonLogger: winston.Logger;

  private namespace: string;

  private readonly requestContext: RequestContextStorage;

  public constructor(config: iLoggerConfig) {
    this.namespace = config.namespace ?? 'global';
    this.winstonLogger =
      config.winstonLogger ?? getOrCreateGlobalLogger(config.colorize ?? env.NODE_ENV !== NODE_ENVIRONMENTS.PRODUCTION);
    this.requestContext = config.requestContext;
  }

  /**
   * Get metadata with request context (userId, requestId) injected automatically.
   */
  private getMetaWithContext(meta?: Record<string, unknown>): Record<string, unknown> {
    const logMeta: Record<string, unknown> = {
      namespace: this.namespace,
      ...meta,
    };

    const requestContext = this.requestContext.current();
    if (requestContext) {
      Object.assign(logMeta, {
        ...(requestContext.userId && { userId: requestContext.userId }),
        requestId: requestContext.requestId,
      });
    }
    return logMeta;
  }

  /**
   * Get the underlying Winston logger instance.
   */
  public getWinstonLogger(): winston.Logger {
    return this.winstonLogger;
  }

  public error(message: string, meta?: Record<string, unknown>) {
    this.winstonLogger.error(message, this.getMetaWithContext(meta));
  }

  public warn(message: string, meta?: Record<string, unknown>) {
    this.winstonLogger.warn(message, this.getMetaWithContext(meta));
  }

  public info(message: string, meta?: Record<string, unknown>) {
    this.winstonLogger.info(message, this.getMetaWithContext(meta));
  }

  public debug(message: string, meta?: Record<string, unknown>) {
    this.winstonLogger.debug(message, this.getMetaWithContext(meta));
  }

  /**
   * Create a child logger with a sub-namespace.
   * The child inherits the same Winston instance but has its own namespace.
   *
   * @example
   * const mainLogger = loggerFactory.create('api');
   * const childLogger = mainLogger.child('users'); // namespace: 'api:users'
   */
  public child(subNamespace: string): Logger {
    const newNamespace = this.namespace === 'global' ? subNamespace : `${this.namespace}:${subNamespace}`;
    return new Logger({
      namespace: newNamespace,
      winstonLogger: this.winstonLogger,
      requestContext: this.requestContext,
    });
  }
}

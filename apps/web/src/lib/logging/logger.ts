import { isOnClient } from '#~/utils/is-on-client';

import { sanitizeLogContext, sanitizeLogMessage, serializeError } from './log-sanitizer';
import { CONSOLE_WRITERS, DEFAULT_MINIMUM_LOG_LEVEL, LOG_LEVEL_SEVERITIES, LOGGER_NAME } from './logger.constants';
import type { iLogger, iLoggerOptions, LogContext, LogLevel } from './logging-contracts';
import { LOG_LEVELS, LOG_RUNTIMES } from './logging-contracts';

const CURRENT_RUNTIME = isOnClient ? LOG_RUNTIMES.CLIENT : LOG_RUNTIMES.SERVER;

/**
 * Writes sanitized, structured records to `console`. Works the same in the browser, in a plain SPA and while a
 * framework renders on the server.
 */
export function createLogger(namespace: string, options: iLoggerOptions = {}): iLogger {
  const { minimumLevel = DEFAULT_MINIMUM_LOG_LEVEL, bindings = {} } = options;

  function write(level: LogLevel, message: string, error?: unknown, context?: LogContext) {
    if (LOG_LEVEL_SEVERITIES.get(level) < LOG_LEVEL_SEVERITIES.get(minimumLevel)) return;

    const fields = {
      ...sanitizeLogContext({ ...bindings, ...context }),
      level,
      runtime: CURRENT_RUNTIME,
      ...(error === undefined ? {} : { error: serializeError(error) }),
    };
    CONSOLE_WRITERS.get(level)(`[${LOGGER_NAME}:${namespace}] ${sanitizeLogMessage(message)}`, fields);
  }

  return {
    debug: (message, context) => write(LOG_LEVELS.DEBUG, message, undefined, context),
    info: (message, context) => write(LOG_LEVELS.INFO, message, undefined, context),
    warn: (message, context) => write(LOG_LEVELS.WARN, message, undefined, context),
    error: (message, error, context) => write(LOG_LEVELS.ERROR, message, error, context),
    fatal: (message, error, context) => write(LOG_LEVELS.FATAL, message, error, context),
    child: (context) => createLogger(namespace, { minimumLevel, bindings: { ...bindings, ...context } }),
  };
}

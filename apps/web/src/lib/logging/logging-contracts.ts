import { em } from 'enumwaii';
import { emToZodSchema } from 'enumwaii/zod';

export const logLevelsEnumwaii = em({
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal',
});

export const LOG_LEVELS = logLevelsEnumwaii.enum;
export type LogLevel = (typeof logLevelsEnumwaii)['~type'];
export const logLevelSchema = emToZodSchema(logLevelsEnumwaii);

/** Where a record was produced: the browser, or the server while it renders. */
const logRuntimesEnumwaii = em(['CLIENT', 'SERVER']);

export const LOG_RUNTIMES = logRuntimesEnumwaii.enum;
export type LogRuntime = (typeof logRuntimesEnumwaii)['~type'];
export const logRuntimeSchema = emToZodSchema(logRuntimesEnumwaii);

export type LogContext = Record<string, unknown>;

export interface iSerializedError {
  name: string;
  message: string;
  stack?: string;
  cause?: string;
}

export interface iLogger {
  debug: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  error: (message: string, error?: unknown, context?: LogContext) => void;
  fatal: (message: string, error?: unknown, context?: LogContext) => void;
  /** A logger for the same namespace whose records always carry `context`. */
  child: (context: LogContext) => iLogger;
}

export interface iLoggerOptions {
  /** Records below this level are dropped. */
  minimumLevel?: LogLevel;
  /** Context attached to every record of the logger. */
  bindings?: LogContext;
}

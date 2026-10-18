import type { Logger } from './logger';

export type LoggerType = Logger;

export interface iWithLogger {
  logger: LoggerType;
}

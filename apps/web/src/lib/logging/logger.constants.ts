import { IS_DEVELOPMENT } from '#~/constants/constants';

import { LOG_LEVELS, logLevelsEnumwaii } from './logging-contracts';

export const LOGGER_NAME = 'startername';

export const DEFAULT_MINIMUM_LOG_LEVEL = IS_DEVELOPMENT ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO;

export const LOG_LEVEL_SEVERITIES = logLevelsEnumwaii.derive<number>()(
  [LOG_LEVELS.DEBUG, 10],
  [LOG_LEVELS.INFO, 20],
  [LOG_LEVELS.WARN, 30],
  [LOG_LEVELS.ERROR, 40],
  [LOG_LEVELS.FATAL, 50],
);

/** Resolve `console` when a record is written, so replacing or spying on its methods takes effect. */
export const CONSOLE_WRITERS = logLevelsEnumwaii.derive(
  [LOG_LEVELS.DEBUG, (...parts: unknown[]) => console.debug(...parts)],
  [LOG_LEVELS.INFO, (...parts: unknown[]) => console.info(...parts)],
  [LOG_LEVELS.WARN, (...parts: unknown[]) => console.warn(...parts)],
  [LOG_LEVELS.ERROR, (...parts: unknown[]) => console.error(...parts)],
  [LOG_LEVELS.FATAL, (...parts: unknown[]) => console.error(...parts)],
);

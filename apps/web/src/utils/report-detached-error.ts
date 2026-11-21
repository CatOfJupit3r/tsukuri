import { createLogger } from '#~/lib/logging/logger';

const logger = createLogger('detached-promise');

export function reportDetachedError(error: unknown) {
  logger.error('Detached promise rejected', error);
}

import { sql } from 'drizzle-orm';

import { HyperdrivePoolFactory } from '#~/features/database/hyperdrive-pool.factory';
import type { Logger } from '#~/features/logger/logger';
import { LoggerFactory } from '#~/features/logger/logger.factory';
import { RequestContextStorage } from '#~/features/request-context/request-context.storage';

import { startHyperdriveSocketServer } from '../helpers/hyperdrive-socket-server';

/** Keeps the messages of the loggers it hands out, so a test reads what was logged. */
class RecordingLoggerFactory extends LoggerFactory {
  public readonly errorMessages: string[] = [];

  public override create(namespace: string): Logger {
    const logger = super.create(namespace);
    logger.error = (message) => {
      this.errorMessages.push(message);
    };
    return logger;
  }
}

describe('HyperdrivePoolFactory', () => {
  it('logs an idle connection failure instead of letting it crash the isolate', async () => {
    const server = await startHyperdriveSocketServer();
    const loggerFactory = new RecordingLoggerFactory(new RequestContextStorage());
    const { database, close } = new HyperdrivePoolFactory(server.hyperdrive, loggerFactory).open();
    await database.execute(sql`select 1`);

    await server.stop();

    await expect.poll(() => loggerFactory.errorMessages).toContain('Postgres connection failed while idle');
    await close();
  });
});

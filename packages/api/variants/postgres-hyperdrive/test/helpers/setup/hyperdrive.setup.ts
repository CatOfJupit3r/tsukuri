import { initializeTestPostgres } from '#test/helpers/postgres-memory';
import { randomUUID } from 'node:crypto';
import { container } from 'tsyringe';
import { aroundEach } from 'vitest';

import { HyperdrivePoolFactory } from '#~/features/database/hyperdrive-pool.factory';
import { LoggerFactory } from '#~/features/logger/logger.factory';
import { RequestContextStorage } from '#~/features/request-context/request-context.storage';

import { PgliteRequestDatabaseFactory } from '../pglite-request-database.factory';

container.registerInstance(
  HyperdrivePoolFactory,
  new PgliteRequestDatabaseFactory(await initializeTestPostgres(), container.resolve(LoggerFactory)),
);

// On a Worker the database exists only while a request is served, so every test (with its hooks) runs as one.
aroundEach(async (runTest) => {
  await container.resolve(RequestContextStorage).run({ requestId: randomUUID() }, runTest);
});

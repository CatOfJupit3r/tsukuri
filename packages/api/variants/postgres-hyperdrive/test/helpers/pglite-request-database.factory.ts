import type { Hyperdrive } from '@cloudflare/workers-types';
import { container } from 'tsyringe';

import type { iRequestDatabase, PostgresDatabase } from '#~/features/database/hyperdrive-pool.factory';
import { HyperdrivePoolFactory } from '#~/features/database/hyperdrive-pool.factory';
import type { LoggerFactory } from '#~/features/logger/logger.factory';

/** The test factory never opens a pool, so nothing reaches the binding. */
const UNREACHED_HYPERDRIVE = {
  connectionString: '',
  host: '',
  ip: '',
  port: 0,
  user: '',
  password: '',
  database: '',
  connect: () => {
    throw new Error('Tests serve every request from the in-memory database');
  },
} satisfies Hyperdrive;

/**
 * Serves every request from the in-memory database, so the tests run `DatabaseService`'s per-request path
 * (one database per request, closed once it is answered) without a Hyperdrive binding.
 */
export class PgliteRequestDatabaseFactory extends HyperdrivePoolFactory {
  public openedCount = 0;

  public closedCount = 0;

  constructor(
    private readonly database: PostgresDatabase,
    loggerFactory: LoggerFactory,
  ) {
    super(UNREACHED_HYPERDRIVE, loggerFactory);
  }

  public override open(): iRequestDatabase {
    this.openedCount += 1;
    return {
      database: this.database,
      close: async () => {
        this.closedCount += 1;
      },
    };
  }
}

/** The factory the Hyperdrive test setup registered, to count the databases requests opened and closed. */
export function resolvePgliteRequestDatabaseFactory() {
  const factory = container.resolve(HyperdrivePoolFactory);
  if (!(factory instanceof PgliteRequestDatabaseFactory)) {
    throw new TypeError('The Hyperdrive test setup did not register the in-memory request database factory');
  }
  return factory;
}

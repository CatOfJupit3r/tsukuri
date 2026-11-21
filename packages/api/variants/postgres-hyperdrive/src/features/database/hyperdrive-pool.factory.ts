import type { Hyperdrive } from '@cloudflare/workers-types';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { Pool } from 'pg';
import { inject, injectable } from 'tsyringe';

import { LoggerFactory } from '#~/features/logger/logger.factory';
import type { iWithLogger, LoggerType } from '#~/features/logger/logger.types';
import { generatedDatabaseSchema } from '#~/generated/database-schema';

import { CONNECTIONS_PER_REQUEST } from './hyperdrive.constants';
import { HYPERDRIVE_TOKEN } from './hyperdrive.token';

/** Any Postgres driver's Drizzle database over the installed tables. */
export type PostgresDatabase = PgDatabase<PgQueryResultHKT, typeof generatedDatabaseSchema>;

export interface iRequestDatabase {
  database: PostgresDatabase;
  /** Ends the request's connections once it has been answered. */
  close: () => Promise<void>;
}

/** Opens the connections of one request: a pool through the Hyperdrive binding. */
@injectable()
export class HyperdrivePoolFactory implements iWithLogger {
  public readonly logger: LoggerType;

  constructor(
    @inject(HYPERDRIVE_TOKEN) private readonly hyperdrive: Hyperdrive,
    loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.create('Database');
  }

  public open(): iRequestDatabase {
    const pool = new Pool({ connectionString: this.hyperdrive.connectionString, max: CONNECTIONS_PER_REQUEST });
    // An idle connection that fails emits on the pool; without a listener it would crash the isolate.
    pool.on('error', (error) => {
      this.logger.error('Postgres connection failed while idle', { error });
    });
    return { database: drizzle(pool, { schema: generatedDatabaseSchema }), close: async () => pool.end() };
  }
}

import type { Hyperdrive } from '@cloudflare/workers-types';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { inject, singleton } from 'tsyringe';

import type { iRequestContext } from '#~/features/request-context/request-context.storage';
import { RequestContextStorage } from '#~/features/request-context/request-context.storage';
import { generatedDatabaseSchema } from '#~/generated/database-schema';
import { UnexpectedServerError } from '#~/lib/orpc-error-wrapper';

import { HYPERDRIVE_TOKEN } from './hyperdrive.token';

const testPostgresDbKey = Symbol.for('startername.test.postgres.db');
/** Hyperdrive pools the real connections, so each request needs only one of its own. */
const CONNECTIONS_PER_REQUEST = 1;

type PostgresDatabase = NodePgDatabase<typeof generatedDatabaseSchema>;
type TestPostgresGlobals = typeof globalThis & {
  [testPostgresDbKey]?: PostgresDatabase;
};

const testGlobals = globalThis as TestPostgresGlobals;

/**
 * A Worker cannot use a connection opened while serving another request, so every request gets its own
 * pool through Hyperdrive. `getDb()` returns one stable database (Better Auth keeps it) that runs each
 * query on the pool of the request being served.
 */
@singleton()
export class DatabaseService {
  private readonly requestDatabases = new WeakMap<iRequestContext, PostgresDatabase>();

  private readonly db: PostgresDatabase;

  constructor(
    @inject(HYPERDRIVE_TOKEN) private readonly hyperdrive: Hyperdrive,
    private readonly requestContextStorage: RequestContextStorage,
  ) {
    // The proxy has no state of its own: every property comes from the current request's database.
    this.db = new Proxy({} as PostgresDatabase, {
      get: (_target, property) => {
        const database = this.currentDatabase();
        const value: unknown = Reflect.get(database, property);
        return typeof value === 'function' ? (value.bind(database) as unknown) : value;
      },
      has: (_target, property) => Reflect.has(this.currentDatabase(), property),
    });
  }

  /** Connections open per request, so there is nothing to connect on startup. */
  public async connect() {}

  public getDb() {
    return this.db;
  }

  public async disconnect() {}

  private currentDatabase() {
    const testDb = testGlobals[testPostgresDbKey];
    if (testDb) return testDb;

    const context = this.requestContextStorage.current();
    if (!context) throw new UnexpectedServerError('Postgres on a Worker is only reachable while serving a request');

    const existing = this.requestDatabases.get(context);
    if (existing) return existing;

    const pool = new Pool({ connectionString: this.hyperdrive.connectionString, max: CONNECTIONS_PER_REQUEST });
    const database = drizzle(pool, { schema: generatedDatabaseSchema });
    this.requestDatabases.set(context, database);
    return database;
  }
}

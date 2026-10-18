import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { singleton } from 'tsyringe';

import { env } from '#~/constants/env';
import { generatedDatabaseSchema } from '#~/generated/database-schema';

const testPostgresDbKey = Symbol.for('startername.test.postgres.db');

type TestPostgresDatabase = NodePgDatabase<typeof generatedDatabaseSchema>;
type TestPostgresGlobals = typeof globalThis & {
  [testPostgresDbKey]?: TestPostgresDatabase;
};

const testGlobals = globalThis as TestPostgresGlobals;

@singleton()
export class PostgresService {
  private pool: Pool | null = null;

  private db: TestPostgresDatabase | null = null;

  public connect() {
    if (this.db) return this.db;

    const testDb = testGlobals[testPostgresDbKey];
    if (testDb) {
      this.db = testDb;
      return this.db;
    }

    this.pool = new Pool({ connectionString: env.POSTGRES_URL });
    this.db = drizzle(this.pool, { schema: generatedDatabaseSchema });

    return this.db;
  }

  public getDb() {
    return this.connect();
  }

  public async disconnect() {
    if (!this.pool) {
      this.db = null;
      return;
    }

    await this.pool.end();
    this.pool = null;
    this.db = null;
  }
}

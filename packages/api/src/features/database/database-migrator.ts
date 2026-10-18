import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import path from 'node:path';
import { Pool } from 'pg';
import { injectable } from 'tsyringe';

import { env } from '#~/constants/env';

import { MIGRATIONS_FOLDER } from './database.constants';

/** Applies the drizzle-kit migrations that have not run against `POSTGRES_URL` yet. */
@injectable()
export class DatabaseMigrator {
  public async migrate(packageDirectory: string) {
    const pool = new Pool({ connectionString: env.POSTGRES_URL });
    try {
      await migrate(drizzle(pool), { migrationsFolder: path.join(packageDirectory, MIGRATIONS_FOLDER) });
    } finally {
      await pool.end();
    }
  }
}

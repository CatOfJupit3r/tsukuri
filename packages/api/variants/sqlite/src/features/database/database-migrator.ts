import path from 'node:path';
import { injectable } from 'tsyringe';

import { env } from '#~/constants/env';
import { generatedDatabaseSchema } from '#~/generated/database-schema';

import { MIGRATIONS_FOLDER } from './database.constants';
import { drizzleNodeSqlite } from './node-sqlite/node-sqlite.driver';
import { SqliteConnectionFactory } from './sqlite-connection.factory';

/** Applies the drizzle-kit migrations that have not run against `SQLITE_PATH` yet. */
@injectable()
export class DatabaseMigrator {
  public constructor(private readonly sqliteConnectionFactory: SqliteConnectionFactory) {}

  public async migrate(packageDirectory: string) {
    const database = await this.sqliteConnectionFactory.open(env.SQLITE_PATH);
    try {
      drizzleNodeSqlite(database, { schema: generatedDatabaseSchema }).migrate(
        path.join(packageDirectory, MIGRATIONS_FOLDER),
      );
    } finally {
      database.close();
    }
  }
}

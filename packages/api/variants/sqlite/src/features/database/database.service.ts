import type { DatabaseSync } from 'node:sqlite';
import { singleton } from 'tsyringe';

import { env } from '#~/constants/env';
import { generatedDatabaseSchema } from '#~/generated/database-schema';
import { UnexpectedServerError } from '#~/lib/orpc-error-wrapper';

import { drizzleNodeSqlite } from './node-sqlite.driver';
import type { NodeSqliteDatabase } from './node-sqlite.driver';
import { SqliteConnectionFactory } from './sqlite-connection.factory';

@singleton()
export class DatabaseService {
  private database: DatabaseSync | null = null;

  private db: NodeSqliteDatabase<typeof generatedDatabaseSchema> | null = null;

  constructor(private readonly sqliteConnectionFactory: SqliteConnectionFactory) {}

  /** Opens `SQLITE_PATH`; runs as a startup task before anything queries. */
  public async connect() {
    if (this.db || globalThis.starternameTestSqliteDb) return;

    this.database = await this.sqliteConnectionFactory.open(env.SQLITE_PATH);
    this.db = drizzleNodeSqlite(this.database, { schema: generatedDatabaseSchema }).db;
  }

  public getDb() {
    this.db ??= globalThis.starternameTestSqliteDb ?? null;
    if (!this.db) throw new UnexpectedServerError('The database is not connected yet');
    return this.db;
  }

  public async disconnect() {
    this.database?.close();
    this.database = null;
    this.db = null;
  }
}

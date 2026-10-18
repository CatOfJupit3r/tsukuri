import { createTableRelationsHelpers, extractTablesRelationalConfig } from 'drizzle-orm';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import { BetterSQLiteSession } from 'drizzle-orm/better-sqlite3/session';
import type { Logger } from 'drizzle-orm/logger';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import { BaseSQLiteDatabase, SQLiteSyncDialect } from 'drizzle-orm/sqlite-core';
import type { DatabaseSync, StatementResultingChanges } from 'node:sqlite';

import { NodeSqliteClient } from './node-sqlite-client';

export type NodeSqliteDatabase<TSchema extends Record<string, unknown>> = BaseSQLiteDatabase<
  'sync',
  StatementResultingChanges,
  TSchema,
  ExtractTablesWithRelations<TSchema>
>;

interface iNodeSqliteDrizzleConfig<TSchema extends Record<string, unknown>> {
  schema: TSchema;
  logger?: Logger;
}

export interface iNodeSqliteDrizzle<TSchema extends Record<string, unknown>> {
  db: NodeSqliteDatabase<TSchema>;
  /** Applies committed drizzle-kit migrations that have not run yet. */
  migrate: (migrationsFolder: string) => void;
}

/**
 * Drizzle has no driver for Node's built-in `node:sqlite`, but its better-sqlite3 session only
 * needs `prepare`, `transaction` and statements with `run`/`all`/`get`/`raw`. `NodeSqliteClient`
 * provides exactly that surface, so the API runs on SQLite without a native module.
 */
export function drizzleNodeSqlite<TSchema extends Record<string, unknown>>(
  database: DatabaseSync,
  config: iNodeSqliteDrizzleConfig<TSchema>,
): iNodeSqliteDrizzle<TSchema> {
  const dialect = new SQLiteSyncDialect();
  const tablesConfig = extractTablesRelationalConfig<ExtractTablesWithRelations<TSchema>>(
    config.schema,
    createTableRelationsHelpers,
  );
  const schema = {
    fullSchema: config.schema,
    schema: tablesConfig.tables,
    tableNamesMap: tablesConfig.tableNamesMap,
  };
  const client = new NodeSqliteClient(database);
  const session = new BetterSQLiteSession<TSchema, ExtractTablesWithRelations<TSchema>>(client, dialect, schema, {
    logger: config.logger,
  });

  return {
    db: new BaseSQLiteDatabase<'sync', StatementResultingChanges, TSchema, ExtractTablesWithRelations<TSchema>>(
      'sync',
      dialect,
      session,
      schema,
    ),
    migrate: (migrationsFolder) => {
      // Migrations run raw SQL, so they use a session without the relational schema.
      const migrationSession = new BetterSQLiteSession(client, dialect, undefined, { logger: config.logger });
      dialect.migrate(readMigrationFiles({ migrationsFolder }), migrationSession, { migrationsFolder });
    },
  };
}

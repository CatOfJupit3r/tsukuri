import type { DatabaseSync } from 'node:sqlite';

import type { generatedDatabaseSchema } from '#~/generated/database-schema';

import type { NodeSqliteDatabase } from './node-sqlite.driver';

declare global {
  /** The in-memory database tests install, which `DatabaseService` picks up. */
  var starternameTestSqliteDb: NodeSqliteDatabase<typeof generatedDatabaseSchema> | undefined;
  var starternameTestSqliteConnection: DatabaseSync | undefined;
}

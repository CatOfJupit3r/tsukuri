import { generateSQLiteDrizzleJson, generateSQLiteMigration } from 'drizzle-kit/api';
import type { DatabaseSync } from 'node:sqlite';
import { container } from 'tsyringe';

import { IN_MEMORY_DATABASE_PATH } from '#~/features/database/database.constants';
import { drizzleNodeSqlite } from '#~/features/database/node-sqlite.driver';
import type { NodeSqliteDatabase } from '#~/features/database/node-sqlite.driver';
import { SqliteConnectionFactory } from '#~/features/database/sqlite-connection.factory';
import { generatedDatabaseSchema } from '#~/generated/database-schema';

const testSqliteDbKey = Symbol.for('startername.test.sqlite.db');
const testSqliteConnectionKey = Symbol.for('startername.test.sqlite.connection');

type TestSqliteGlobals = typeof globalThis & {
  [testSqliteDbKey]?: NodeSqliteDatabase<typeof generatedDatabaseSchema>;
  [testSqliteConnectionKey]?: DatabaseSync;
};

const testGlobals = globalThis as TestSqliteGlobals;

/** An in-memory SQLite with the installed modules' tables, which `DatabaseService` picks up in tests. */
export async function initializeTestSqlite() {
  if (testGlobals[testSqliteDbKey]) return;

  const database = await container.resolve(SqliteConnectionFactory).open(IN_MEMORY_DATABASE_PATH);
  const statements = await generateSQLiteMigration(
    await generateSQLiteDrizzleJson({}),
    await generateSQLiteDrizzleJson(generatedDatabaseSchema),
  );
  for (const statement of statements) database.exec(statement);

  testGlobals[testSqliteConnectionKey] = database;
  testGlobals[testSqliteDbKey] = drizzleNodeSqlite(database, { schema: generatedDatabaseSchema }).db;
}

/** Deletes every row while keeping the tables, so each test starts from an empty database. */
export function clearTestSqliteTables() {
  const database = testGlobals[testSqliteConnectionKey];
  if (!database) return;

  const tableNames = database
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
    .all()
    .map((row) => String(row.name));

  database.exec('PRAGMA foreign_keys = OFF');
  for (const tableName of tableNames) database.exec(`DELETE FROM "${tableName}"`);
  database.exec('PRAGMA foreign_keys = ON');
}

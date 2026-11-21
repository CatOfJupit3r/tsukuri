import { generateSQLiteDrizzleJson, generateSQLiteMigration } from 'drizzle-kit/api';
import { container } from 'tsyringe';

import { IN_MEMORY_DATABASE_PATH } from '#~/features/database/database.constants';
import { drizzleNodeSqlite } from '#~/features/database/node-sqlite.driver';
import { SqliteConnectionFactory } from '#~/features/database/sqlite-connection.factory';
import { generatedDatabaseSchema } from '#~/generated/database-schema';

/** An in-memory SQLite with the installed modules' tables, which `DatabaseService` picks up in tests. */
export async function initializeTestSqlite() {
  if (globalThis.starternameTestSqliteDb) return;

  const database = await container.resolve(SqliteConnectionFactory).open(IN_MEMORY_DATABASE_PATH);
  const statements = await generateSQLiteMigration(
    await generateSQLiteDrizzleJson({}),
    await generateSQLiteDrizzleJson(generatedDatabaseSchema),
  );
  for (const statement of statements) database.exec(statement);

  globalThis.starternameTestSqliteConnection = database;
  globalThis.starternameTestSqliteDb = drizzleNodeSqlite(database, { schema: generatedDatabaseSchema }).db;
}

/** Deletes every row while keeping the tables, so each test starts from an empty database. */
export function clearTestSqliteTables() {
  const database = globalThis.starternameTestSqliteConnection;
  if (!database) return;

  const tableNames = database
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
    .all()
    .map((row) => String(row.name));

  database.exec('PRAGMA foreign_keys = OFF');
  for (const tableName of tableNames) database.exec(`DELETE FROM "${tableName}"`);
  database.exec('PRAGMA foreign_keys = ON');
}

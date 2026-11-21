import { startLocalD1Database } from '#test/helpers/cloudflare-platform';
import type { D1Database } from '@cloudflare/workers-types';
import { generateSQLiteDrizzleJson, generateSQLiteMigration } from 'drizzle-kit/api';
import { container } from 'tsyringe';
import { afterEach } from 'vitest';

import { D1_DATABASE_TOKEN } from '#~/features/database/d1-database.token';
import { generatedDatabaseSchema } from '#~/generated/database-schema';

const testD1Key = Symbol.for('startername.test.d1');
const testGlobals = globalThis as typeof globalThis & { [testD1Key]?: Promise<D1Database> };

/** A local D1 database with the installed modules' tables, shared by every integration test file of the run. */
async function createTestD1() {
  const { binding: database } = await startLocalD1Database();
  const statements = await generateSQLiteMigration(
    await generateSQLiteDrizzleJson({}),
    await generateSQLiteDrizzleJson(generatedDatabaseSchema),
  );
  for (const statement of statements) await database.prepare(statement).run();
  return database;
}

testGlobals[testD1Key] ??= createTestD1();
const testD1 = await testGlobals[testD1Key];
container.registerInstance(D1_DATABASE_TOKEN, testD1);

afterEach(async () => {
  const { results } = await testD1
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'",
    )
    .all<{ name: string }>();
  // D1 always enforces foreign keys; deferring them lets the batch empty tables in any order.
  await testD1.batch([
    testD1.prepare('PRAGMA defer_foreign_keys = true'),
    ...results.map(({ name }) => testD1.prepare(`DELETE FROM "${name}"`)),
  ]);
});

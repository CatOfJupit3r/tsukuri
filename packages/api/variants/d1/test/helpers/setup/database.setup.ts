import type { D1Database } from '@cloudflare/workers-types';
import { generateSQLiteDrizzleJson, generateSQLiteMigration } from 'drizzle-kit/api';
import { container } from 'tsyringe';
import { afterEach } from 'vitest';

import { D1_DATABASE_TOKEN } from '#~/features/database/d1-database.token';
import { generatedDatabaseSchema } from '#~/generated/database-schema';

import { startLocalCloudflarePlatform } from '../cloudflare-platform';

interface iD1Bindings extends Record<string, unknown> {
  DB: D1Database;
}

const testD1Key = Symbol.for('startername.test.d1');
const testGlobals = globalThis as typeof globalThis & { [testD1Key]?: Promise<D1Database> };

/** A local D1 database with the installed modules' tables, shared by every integration test file. */
async function createTestD1() {
  const platform = await startLocalCloudflarePlatform<iD1Bindings>({
    d1_databases: [{ binding: 'DB', database_name: 'startername-test', database_id: 'local' }],
  });
  const statements = await generateSQLiteMigration(
    await generateSQLiteDrizzleJson({}),
    await generateSQLiteDrizzleJson(generatedDatabaseSchema),
  );
  for (const statement of statements) await platform.env.DB.prepare(statement).run();
  return platform.env.DB;
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

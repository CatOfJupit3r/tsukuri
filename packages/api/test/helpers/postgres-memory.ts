import { PGlite } from '@electric-sql/pglite';
import { pushSchema } from 'drizzle-kit/api';
import { drizzle } from 'drizzle-orm/pglite';
import type { PgliteDatabase } from 'drizzle-orm/pglite';

import { generatedDatabaseSchema } from '#~/generated/database-schema';

const testPostgresDbKey = Symbol.for('startername.test.postgres.db');
const testPostgresReadyKey = Symbol.for('startername.test.postgres.ready');

type TestPostgresDatabase = PgliteDatabase<typeof generatedDatabaseSchema> & { $client: PGlite };
type TestPostgresGlobals = typeof globalThis & {
  [testPostgresDbKey]?: TestPostgresDatabase;
  [testPostgresReadyKey]?: Promise<void>;
};

const testGlobals = globalThis as TestPostgresGlobals;

/** An in-memory Postgres with the installed modules' tables, which `PostgresService` picks up in tests. */
async function createTestPostgresDb() {
  const client = await PGlite.create('memory://');
  const { apply } = await pushSchema(generatedDatabaseSchema, drizzle({ client }));
  await apply();
  testGlobals[testPostgresDbKey] = drizzle({ client, schema: generatedDatabaseSchema });
}

export async function initializeTestPostgres() {
  if (testGlobals[testPostgresDbKey]) return;

  testGlobals[testPostgresReadyKey] ??= createTestPostgresDb();
  await testGlobals[testPostgresReadyKey];
}

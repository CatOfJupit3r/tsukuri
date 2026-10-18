import { getTableName, is, sql } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';
import { container } from 'tsyringe';
import { afterEach } from 'vitest';

import { PostgresService } from '#~/features/postgres/postgres.service';
import { generatedDatabaseSchema } from '#~/generated/database-schema';

import { initializeTestPostgres } from '../postgres-memory';

await initializeTestPostgres();

const tableNames = Object.values(generatedDatabaseSchema)
  .filter((value) => is(value, PgTable))
  .map((table) => `"${getTableName(table)}"`)
  .join(', ');

afterEach(async () => {
  if (!tableNames) return;
  await container
    .resolve(PostgresService)
    .getDb()
    .execute(sql.raw(`TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE`));
});

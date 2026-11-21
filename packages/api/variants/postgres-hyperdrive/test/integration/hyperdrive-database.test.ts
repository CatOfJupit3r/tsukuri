import { sql } from 'drizzle-orm';
import { container } from 'tsyringe';

import { DatabaseService } from '#~/features/database/database.service';
import { RequestContextStorage } from '#~/features/request-context/request-context.storage';
import type { iWaitUntil } from '#~/features/request-context/request-context.storage';

import { resolvePgliteRequestDatabaseFactory } from '../helpers/pglite-request-database.factory';

const REQUEST_COUNT = 3;

async function serveRequest(requestId: string, waitUntil?: iWaitUntil) {
  const databaseService = container.resolve(DatabaseService);
  await container.resolve(RequestContextStorage).run({ requestId, waitUntil }, async () => {
    await databaseService.getDb().execute(sql`select 1`);
    await databaseService.getDb().execute(sql`select 2`);
  });
}

describe('DatabaseService on a Worker', () => {
  it('opens one database per request and closes it after the response, through waitUntil', async () => {
    const factory = resolvePgliteRequestDatabaseFactory();
    const { openedCount, closedCount } = factory;
    const finishing: Promise<unknown>[] = [];

    await serveRequest('first', (promise) => finishing.push(promise));
    await Promise.all(finishing);
    await serveRequest('second', (promise) => finishing.push(promise));
    await Promise.all(finishing);

    expect(finishing).toHaveLength(2);
    expect(factory.openedCount - openedCount).toBe(2);
    expect(factory.closedCount - closedCount).toBe(2);
  });

  it('gives concurrent requests their own databases and closes every one', async () => {
    const factory = resolvePgliteRequestDatabaseFactory();
    const { openedCount, closedCount } = factory;

    await Promise.all(Array.from({ length: REQUEST_COUNT }, async (_, index) => serveRequest(`concurrent-${index}`)));

    expect(factory.openedCount - openedCount).toBe(REQUEST_COUNT);
    expect(factory.closedCount - closedCount).toBe(REQUEST_COUNT);
  });
});

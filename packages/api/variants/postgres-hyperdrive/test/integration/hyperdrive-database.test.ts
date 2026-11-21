import { sql } from 'drizzle-orm';
import { container } from 'tsyringe';

import { DatabaseService } from '#~/features/database/database.service';
import { CONNECTIONS_PER_REQUEST } from '#~/features/database/hyperdrive.constants';
import { RequestContextStorage } from '#~/features/request-context/request-context.storage';
import type { iWaitUntil } from '#~/features/request-context/request-context.storage';

import { getHyperdriveSocketServer } from '../helpers/hyperdrive-socket-server';

const CONCURRENT_REQUEST_COUNT = 8;
const PARALLEL_QUERY_COUNT = 12;
const QUERY_SETTLE_TIMEOUT_MILLISECONDS = 5000;

async function serveRequest(requestId: string, handler: () => Promise<unknown>, waitUntil?: iWaitUntil) {
  await container.resolve(RequestContextStorage).run({ requestId, waitUntil }, handler);
}

async function runTwoQueries() {
  const database = container.resolve(DatabaseService).getDb();
  await database.execute(sql`select 1`);
  await database.execute(sql`select 2`);
}

/** Earlier tests' pools (and the hooks' request) close asynchronously, so a test starts once none is left. */
async function connectionCountsBefore() {
  const { connectionCounts } = await getHyperdriveSocketServer();
  await expect.poll(() => connectionCounts().active).toBe(0);
  return { connectionCounts, before: connectionCounts() };
}

describe('DatabaseService on a Worker', () => {
  it('opens a connection for a request and closes it once the response is ready', async () => {
    const { connectionCounts, before } = await connectionCountsBefore();

    await serveRequest('first', runTwoQueries);

    expect(connectionCounts().opened - before.opened).toBe(1);
    await expect.poll(() => connectionCounts().active).toBe(0);
  });

  it('closes the connection through waitUntil when the runtime provides it', async () => {
    const { connectionCounts, before } = await connectionCountsBefore();
    const finishing: Promise<unknown>[] = [];

    await serveRequest('wait-until', runTwoQueries, (promise) => finishing.push(promise));

    expect(finishing).toHaveLength(1);
    await Promise.all(finishing);
    expect(connectionCounts().opened - before.opened).toBe(1);
    await expect.poll(() => connectionCounts().active).toBe(0);
  });

  it('closes the connection when the handler throws', async () => {
    const { connectionCounts, before } = await connectionCountsBefore();

    await expect(
      serveRequest('throwing', async () => {
        await runTwoQueries();
        throw new Error('handler failed');
      }),
    ).rejects.toThrow('handler failed');

    expect(connectionCounts().opened - before.opened).toBe(1);
    await expect.poll(() => connectionCounts().active).toBe(0);
  });

  it('still closes the connection when another finish task of the request rejects', async () => {
    const { connectionCounts } = await connectionCountsBefore();

    await serveRequest('rejecting-task', async () => {
      await runTwoQueries();
      container
        .resolve(RequestContextStorage)
        .current()
        ?.finishTasks.unshift(async () => {
          throw new Error('cleanup failed');
        });
    });

    await expect.poll(() => connectionCounts().active).toBe(0);
  });

  it('gives every concurrent request a pool of its own and closes all of them', async () => {
    const { connectionCounts, before } = await connectionCountsBefore();

    await Promise.all(
      Array.from({ length: CONCURRENT_REQUEST_COUNT }, async (_, index) =>
        serveRequest(`concurrent-${index}`, runTwoQueries),
      ),
    );

    expect(connectionCounts().opened - before.opened).toBe(CONCURRENT_REQUEST_COUNT);
    await expect.poll(() => connectionCounts().active).toBe(0);
  });

  it('never opens more connections for one request than its pool allows', async () => {
    const { connectionCounts, before } = await connectionCountsBefore();

    await serveRequest('parallel-queries', async () => {
      const database = container.resolve(DatabaseService).getDb();
      await Promise.all(Array.from({ length: PARALLEL_QUERY_COUNT }, async () => database.execute(sql`select 1`)));
    });

    expect(connectionCounts().opened - before.opened).toBeLessThanOrEqual(CONNECTIONS_PER_REQUEST);
    await expect.poll(() => connectionCounts().active).toBe(0);
  });

  it('lets background queries that already hold a connection finish after the response is ready', async () => {
    const { connectionCounts } = await connectionCountsBefore();
    const backgroundQueries: Promise<unknown>[] = [];

    await serveRequest('background-queries', async () => {
      const database = container.resolve(DatabaseService).getDb();
      // Started and not awaited, like Better Auth's pruning of expired rate-limit rows.
      for (let index = 0; index < CONNECTIONS_PER_REQUEST; index += 1) {
        backgroundQueries.push(database.execute(sql`select pg_sleep(0.2)`).then((result) => result));
      }
    });

    const outcomes = await Promise.race([
      Promise.allSettled(backgroundQueries),
      new Promise<never>((_, reject) => {
        setTimeout(reject, QUERY_SETTLE_TIMEOUT_MILLISECONDS, new Error('hung'));
      }),
    ]);
    expect(outcomes.map(({ status }) => status)).toEqual(Array(CONNECTIONS_PER_REQUEST).fill('fulfilled'));
    await expect.poll(() => connectionCounts().active).toBe(0);
  });
});

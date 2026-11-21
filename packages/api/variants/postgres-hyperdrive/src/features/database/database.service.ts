import { singleton } from 'tsyringe';

import type { iRequestContext } from '#~/features/request-context/request-context.storage';
import { RequestContextStorage } from '#~/features/request-context/request-context.storage';
import { UnexpectedServerError } from '#~/lib/orpc-error-wrapper';

import type { PostgresDatabase } from './hyperdrive-pool.factory';
import { HyperdrivePoolFactory } from './hyperdrive-pool.factory';

/**
 * A Worker cannot use a connection opened while serving another request, so `getDb()` returns the
 * database of the request being served: opened on its first query and closed once the response is ready.
 */
@singleton()
export class DatabaseService {
  private readonly requestDatabases = new WeakMap<iRequestContext, PostgresDatabase>();

  constructor(
    private readonly hyperdrivePoolFactory: HyperdrivePoolFactory,
    private readonly requestContextStorage: RequestContextStorage,
  ) {}

  /** Connections open per request, so there is nothing to connect on startup. */
  public async connect() {}

  public getDb() {
    const context = this.requestContextStorage.current();
    if (!context) throw new UnexpectedServerError('Postgres on a Worker is only reachable while serving a request');

    const existing = this.requestDatabases.get(context);
    if (existing) return existing;

    const { database, close } = this.hyperdrivePoolFactory.open();
    context.finishTasks.push(close);
    this.requestDatabases.set(context, database);
    return database;
  }

  /** Every pool belongs to a request and ends with it. */
  public async disconnect() {}
}

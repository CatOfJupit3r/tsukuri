import { em } from 'enumwaii';
import type { DatabaseSync } from 'node:sqlite';

import { NodeSqliteStatement } from './node-sqlite-statement';

type TransactionBody<T> = (...args: unknown[]) => T;

/** `BEGIN` modes of a SQLite transaction. */
const transactionModesEnumwaii = em(['DEFERRED', 'IMMEDIATE', 'EXCLUSIVE']);
const TRANSACTION_MODES = transactionModesEnumwaii.enum;
type TransactionMode = (typeof transactionModesEnumwaii)['~type'];

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  // eslint-disable-next-line tsukuri/no-in-narrowing -- the transaction body may return any value; only a thenable is rejected
  return typeof value === 'object' && value !== null && 'then' in value && typeof value.then === 'function';
}

/** A `node:sqlite` database shaped like the better-sqlite3 client Drizzle's session expects. */
export class NodeSqliteClient {
  public constructor(private readonly database: DatabaseSync) {}

  public prepare(sql: string) {
    return new NodeSqliteStatement(this.database.prepare(sql));
  }

  public transaction<T>(body: TransactionBody<T>) {
    const runIn =
      (mode: TransactionMode) =>
      (...args: unknown[]) => {
        this.database.exec(`BEGIN ${mode}`);
        try {
          const result = body(...args);
          if (isPromiseLike(result)) {
            throw new Error('SQLite transactions are synchronous; the transaction body returned a promise.');
          }
          this.database.exec('COMMIT');
          return result;
        } catch (error) {
          if (this.database.isTransaction) this.database.exec('ROLLBACK');
          throw error;
        }
      };

    return Object.assign(runIn(TRANSACTION_MODES.DEFERRED), {
      deferred: runIn(TRANSACTION_MODES.DEFERRED),
      immediate: runIn(TRANSACTION_MODES.IMMEDIATE),
      exclusive: runIn(TRANSACTION_MODES.EXCLUSIVE),
    });
  }
}

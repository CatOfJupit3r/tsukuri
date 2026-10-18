import type { DatabaseSync } from 'node:sqlite';

import { NodeSqliteStatement } from './node-sqlite-statement';

type TransactionBody<T> = (...args: unknown[]) => T;

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return typeof value === 'object' && value !== null && 'then' in value && typeof value.then === 'function';
}

/** A `node:sqlite` database shaped like the better-sqlite3 client Drizzle's session expects. */
export class NodeSqliteClient {
  constructor(private readonly database: DatabaseSync) {}

  public prepare(sql: string) {
    return new NodeSqliteStatement(this.database.prepare(sql));
  }

  public transaction<T>(body: TransactionBody<T>) {
    const runIn =
      (mode: 'DEFERRED' | 'IMMEDIATE' | 'EXCLUSIVE') =>
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

    return Object.assign(runIn('DEFERRED'), {
      deferred: runIn('DEFERRED'),
      immediate: runIn('IMMEDIATE'),
      exclusive: runIn('EXCLUSIVE'),
    });
  }
}

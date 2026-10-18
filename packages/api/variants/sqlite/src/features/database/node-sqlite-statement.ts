import type { SQLInputValue, StatementSync } from 'node:sqlite';

/** A `node:sqlite` statement shaped like the better-sqlite3 statement Drizzle's session expects. */
export class NodeSqliteStatement {
  constructor(
    private readonly statement: StatementSync,
    private readonly shouldReturnArrays = false,
  ) {}

  public raw() {
    return new NodeSqliteStatement(this.statement, true);
  }

  public run(...params: SQLInputValue[]) {
    return this.statement.run(...params);
  }

  public all(...params: SQLInputValue[]) {
    this.statement.setReturnArrays(this.shouldReturnArrays);
    return this.statement.all(...params);
  }

  public get(...params: SQLInputValue[]) {
    this.statement.setReturnArrays(this.shouldReturnArrays);
    return this.statement.get(...params);
  }
}

import { integer, text } from 'drizzle-orm/sqlite-core';
import { randomUUID } from 'node:crypto';

export function idColumn(columnName: string) {
  return text(columnName);
}

export function idPrimaryKey(columnName = 'id') {
  return idColumn(columnName)
    .primaryKey()
    .$defaultFn(() => randomUUID());
}

export function timestampColumn(columnName: string) {
  return integer(columnName, { mode: 'timestamp_ms' });
}

export function booleanColumn(columnName: string) {
  return integer(columnName, { mode: 'boolean' });
}

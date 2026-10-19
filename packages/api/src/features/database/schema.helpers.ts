import { uuid } from 'drizzle-orm/pg-core';

export function idColumn(columnName: string) {
  return uuid(columnName);
}

export function idPrimaryKey(columnName = 'id') {
  return idColumn(columnName).defaultRandom().primaryKey();
}

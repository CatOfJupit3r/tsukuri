import { em } from 'enumwaii';

/** Values match the provider names Drizzle adapters (for example Better Auth's) expect. */
const databaseDialectsEnumwaii = em({
  POSTGRES: 'pg',
  SQLITE: 'sqlite',
});

export const DATABASE_DIALECTS = databaseDialectsEnumwaii.enum;
export type DatabaseDialect = (typeof databaseDialectsEnumwaii)['~type'];

import { DATABASE_DIALECTS } from './database-dialects.enums';

export const DATABASE_DIALECT = DATABASE_DIALECTS.SQLITE;

/** drizzle-kit writes migrations here (relative to the API package); `wrangler d1 migrations apply` reads them. */
export const MIGRATIONS_FOLDER = 'src/db/migrations';

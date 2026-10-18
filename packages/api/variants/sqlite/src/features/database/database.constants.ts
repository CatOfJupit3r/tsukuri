import { DATABASE_DIALECTS } from './database-dialects.enums';

export const DATABASE_DIALECT = DATABASE_DIALECTS.SQLITE;

/** drizzle-kit writes migrations here (relative to the API package); `db:migrate` applies them. */
export const MIGRATIONS_FOLDER = 'src/db/migrations';

export const IN_MEMORY_DATABASE_PATH = ':memory:';

import { DATABASE_DIALECTS } from './database-dialects.enums';

export const DATABASE_DIALECT = DATABASE_DIALECTS.POSTGRES;

/** drizzle-kit writes migrations here (relative to the API package); `db:migrate` applies them. */
export const MIGRATIONS_FOLDER = 'src/db/migrations';

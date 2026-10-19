import { DrizzleQueryError } from 'drizzle-orm';
import { injectable } from 'tsyringe';

/** D1 reports SQLite's constraint errors only as text; unique and primary key violations share it. */
const D1_UNIQUE_VIOLATION_MESSAGE = 'UNIQUE constraint failed';

/** Recognises database errors that callers handle as outcomes instead of failures. */
@injectable()
export class DatabaseErrorGuard {
  public isUniqueViolation(error: unknown) {
    const cause = error instanceof DrizzleQueryError ? error.cause : error;
    return cause instanceof Error && cause.message.includes(D1_UNIQUE_VIOLATION_MESSAGE);
  }
}

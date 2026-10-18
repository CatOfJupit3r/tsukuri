import { DrizzleQueryError } from 'drizzle-orm';
import { injectable } from 'tsyringe';
import z from 'zod';

/** Extended result codes `node:sqlite` reports for unique and primary key constraint failures. */
const SQLITE_UNIQUE_VIOLATION_CODES = new Set([2067, 1555]);

const sqliteErrorSchema = z.looseObject({ errcode: z.number() });

/** Recognises database errors that callers handle as outcomes instead of failures. */
@injectable()
export class DatabaseErrorGuard {
  public isUniqueViolation(error: unknown) {
    const errorCode = this.readSqliteErrorCode(error);
    return errorCode === undefined ? false : SQLITE_UNIQUE_VIOLATION_CODES.has(errorCode);
  }

  private readSqliteErrorCode(error: unknown) {
    const cause = error instanceof DrizzleQueryError ? error.cause : error;
    return sqliteErrorSchema.safeParse(cause).data?.errcode;
  }
}

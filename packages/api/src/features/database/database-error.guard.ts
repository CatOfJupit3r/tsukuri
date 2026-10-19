import { DrizzleQueryError } from 'drizzle-orm';
import { injectable } from 'tsyringe';
import z from 'zod';

const POSTGRES_UNIQUE_VIOLATION_CODE = '23505';

const postgresErrorSchema = z.looseObject({ code: z.string() });

/** Recognises database errors that callers handle as outcomes instead of failures. */
@injectable()
export class DatabaseErrorGuard {
  public isUniqueViolation(error: unknown) {
    return this.readPostgresErrorCode(error) === POSTGRES_UNIQUE_VIOLATION_CODE;
  }

  private readPostgresErrorCode(error: unknown) {
    if (!(error instanceof DrizzleQueryError)) return undefined;
    return postgresErrorSchema.safeParse(error.cause).data?.code;
  }
}

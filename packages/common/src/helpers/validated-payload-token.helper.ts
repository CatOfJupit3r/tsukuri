import type z from 'zod';

import { PayloadToken } from './payload-token.helper';
import type { PayloadTokenName } from './payload-token.helper';

/** A token whose payload can be validated where it enters from outside the process. */
export class ValidatedPayloadToken<TPayload, TName extends PayloadTokenName = PayloadTokenName> extends PayloadToken<
  TPayload,
  TName
> {
  public constructor(
    name: TName,
    public readonly schema: z.ZodType<TPayload>,
  ) {
    super(name);
  }

  /** Returns the payload or throws a `ZodError`. */
  public parse(input: unknown): TPayload {
    return this.schema.parse(input);
  }

  public safeParse(input: unknown) {
    return this.schema.safeParse(input);
  }
}

import type { Enumwaii, EnumwaiiValue } from 'enumwaii';
import z from 'zod';

import { PayloadToken } from './payload-token.helper';
import type { PayloadTokenName, TokenMessage } from './payload-token.helper';
import { ValidatedPayloadToken } from './validated-payload-token.helper';

/** Declares a payload type for a token that never crosses a runtime boundary. */
export class PayloadType<TPayload> {
  declare private readonly payloadType: TPayload;
}

export function payloadOf<TPayload>() {
  return new PayloadType<TPayload>();
}

type iPayloadSpec = PayloadType<unknown> | z.ZodType;

type TokenOfSpec<TSpec, TName extends PayloadTokenName> =
  TSpec extends z.ZodType<infer TPayload>
    ? ValidatedPayloadToken<TPayload, TName>
    : TSpec extends PayloadType<infer TPayload>
      ? PayloadToken<TPayload, TName>
      : never;

type iPayloadTokenSet<
  TIdentity extends string,
  TKeys extends Readonly<Record<string, string>>,
  TSpecs extends Record<keyof TKeys, iPayloadSpec>,
> = { readonly [TKey in keyof TKeys]: TokenOfSpec<TSpecs[TKey], EnumwaiiValue<TKeys[TKey], TIdentity>> };

/**
 * One token per member of an enumwaii declaration, named by that member. Pass a zod schema for payloads
 * that are validated at a boundary, `payloadOf<T>()` for payloads that stay in the process.
 */
export function definePayloadTokens<
  TRaw extends string,
  TIdentity extends string,
  TKeys extends Readonly<Record<string, string>>,
  const TSpecs extends Record<keyof TKeys, iPayloadSpec>,
>(
  names: Enumwaii<TRaw, TIdentity, TKeys>,
  specs: TSpecs & Readonly<Record<Exclude<keyof TSpecs, keyof TKeys>, never>>,
) {
  const specsByKey: Readonly<Record<string, iPayloadSpec>> = specs;
  const tokens = Object.fromEntries(
    Object.entries<PayloadTokenName>(names.enum).map(([key, name]) => {
      const spec = specsByKey[key];
      if (!spec) throw new Error(`No payload declared for token ${name}`);
      return [key, spec instanceof PayloadType ? new PayloadToken(name) : new ValidatedPayloadToken(name, spec)];
    }),
  );
  return Object.freeze(tokens) as iPayloadTokenSet<TIdentity, TKeys, TSpecs>;
}

type iValidatedTokens = Readonly<Record<string, ValidatedPayloadToken<unknown>>>;

/**
 * A zod schema for `{ name, payload }` messages of any token in the set: the name picks the token and its
 * schema validates the payload. Use it where messages arrive (WebSocket, BroadcastChannel, worker, storage).
 */
export function payloadMessageSchema<TTokens extends iValidatedTokens>(tokens: TTokens) {
  const [first, ...rest] = Object.values(tokens).map((token) =>
    z.object({ name: z.literal(token.name), payload: token.schema }),
  );
  if (!first) throw new Error('A payload message schema needs at least one token');
  // The union is built from the tokens at runtime, so TypeScript cannot relate it to their payload types.
  return z.discriminatedUnion('name', [first, ...rest]) as unknown as z.ZodType<TokenMessage<TTokens[keyof TTokens]>>;
}

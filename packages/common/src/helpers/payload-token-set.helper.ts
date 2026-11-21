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

/** Confirms that `tokens` holds exactly one token per member of the declaration, named by that member. */
function isTokenSetOf<
  TRaw extends string,
  TIdentity extends string,
  TKeys extends Readonly<Record<string, string>>,
  TSpecs extends Record<keyof TKeys, iPayloadSpec>,
>(
  tokens: Readonly<Record<string, PayloadToken<unknown>>>,
  names: Enumwaii<TRaw, TIdentity, TKeys>,
): tokens is iPayloadTokenSet<TIdentity, TKeys, TSpecs> {
  const memberEntries = Object.entries<string>(names.enum);
  return (
    Object.keys(tokens).length === memberEntries.length &&
    memberEntries.every(([key, name]) => tokens[key]?.name === name)
  );
}

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
  const tokens: Record<string, PayloadToken<unknown>> = {};
  for (const [key, name] of Object.entries<PayloadTokenName>(names.enum)) {
    const spec = specsByKey[key];
    if (!spec) throw new Error(`No payload declared for token ${name}`);
    tokens[key] = spec instanceof PayloadType ? new PayloadToken(name) : new ValidatedPayloadToken(name, spec);
  }
  if (!isTokenSetOf<TRaw, TIdentity, TKeys, TSpecs>(tokens, names)) {
    throw new Error('The built tokens do not match the enumwaii declaration');
  }
  return Object.freeze(tokens);
}

type iValidatedTokens = Readonly<Record<string, ValidatedPayloadToken<unknown>>>;

/** Confirms that the union has one option per token, selected by that token's name. */
function isMessageSchemaOf<TTokens extends iValidatedTokens>(
  schema: z.ZodType,
  tokens: TTokens,
): schema is z.ZodType<TokenMessage<TTokens[keyof TTokens]>> {
  if (!(schema instanceof z.ZodDiscriminatedUnion)) return false;
  // eslint-disable-next-line no-underscore-dangle -- zod exposes the discriminator values of a union only through its internals
  const optionNames = schema._zod.propValues?.name;
  if (!optionNames) return false;
  const tokenNames = Object.values(tokens).map((token) => token.name);
  return optionNames.size === new Set(tokenNames).size && tokenNames.every((name) => optionNames.has(name));
}

/**
 * A zod schema for `{ name, payload }` messages of any token in the set: the name picks the token and its
 * schema validates the payload. Use it where messages arrive (WebSocket, BroadcastChannel, worker, storage).
 */
export function payloadMessageSchema<TTokens extends iValidatedTokens>(tokens: TTokens) {
  const [first, ...rest] = Object.values(tokens).map((token) =>
    z.object({ name: z.literal(token.name), payload: token.schema }),
  );
  if (!first) throw new Error('A payload message schema needs at least one token');
  const schema: z.ZodType = z.discriminatedUnion('name', [first, ...rest]);
  if (!isMessageSchemaOf(schema, tokens)) throw new Error('The message schema does not match the tokens');
  return schema;
}

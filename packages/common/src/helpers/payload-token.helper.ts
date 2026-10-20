import type { EnumwaiiBrand } from 'enumwaii';

/** A member of any enumwaii declaration: token names are never raw strings. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the brand's identity is invariant, so only `any` admits members of every declaration
export type PayloadTokenName = string & EnumwaiiBrand<any>;

/**
 * A named channel for one payload shape: an event on a bus, a message between tabs or a worker, a
 * stored preference, a drag-and-drop kind. Whatever sends or receives through the token is checked
 * against its payload type; `name` is what crosses the wire.
 */
export class PayloadToken<TPayload = never, TName extends PayloadTokenName = PayloadTokenName> {
  /** Carries the payload type at compile time only. */
  declare private readonly payloadType: TPayload;

  public constructor(public readonly name: TName) {}

  /** Wraps a payload with this token's name for transport. */
  public message(payload: TPayload): iPayloadMessage<TPayload, TName> {
    return { name: this.name, payload };
  }

  /** Narrows an already validated message union to this token's message; parse raw input first. */
  public matches<TMessage extends iPayloadMessage<unknown>>(
    message: TMessage,
  ): message is Extract<TMessage, { name: TName }> {
    return message.name === this.name;
  }
}

/** A payload sent through a token, as it travels over a channel. */
export interface iPayloadMessage<TPayload, TName extends string = string> {
  name: TName;
  payload: TPayload;
}

export type TokenPayload<TToken> = TToken extends PayloadToken<infer TPayload> ? TPayload : never;

export type TokenName<TToken> = TToken extends PayloadToken<unknown, infer TName> ? TName : never;

/** The messages of a token or token union; narrow the union with `token.matches(message)`. */
export type TokenMessage<TToken> =
  TToken extends PayloadToken<infer TPayload, infer TName> ? iPayloadMessage<TPayload, TName> : never;
